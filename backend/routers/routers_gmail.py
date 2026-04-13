"""
Gmail Agent router — Phase 4.

POST /gmail/process is the only trigger — no background scheduling.
Emails are fetched from Gmail via stored OAuth token, then classified
with OpenAI and used to update the application tracker.

Endpoints (OAuth flow lives in gmail_oauth.py):
  POST /gmail/process          fetch emails + classify + update tracker
  GET  /gmail/agent/status     current agent config for this user
  PUT  /gmail/agent/config     update config (confidence_threshold, max_emails_per_run)
  GET  /gmail/agent/log        last N runs summary
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db, User
from auth import get_current_user
from gmail_agent import process_email_batch
from gmail_oauth import fetch_job_emails

router = APIRouter(prefix="/gmail", tags=["gmail"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProcessRequest(BaseModel):
    confidence_threshold: Optional[float] = 0.65
    max_emails:           Optional[int]   = 50


class AgentConfig(BaseModel):
    enabled:              bool  = True
    confidence_threshold: float = 0.65
    max_emails_per_run:   int   = 50


# In-memory config + log store per user_id
_agent_configs: dict = {}
_agent_logs:    dict = {}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/process")
async def process_emails(
    payload: ProcessRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Fetch job emails via stored OAuth token, classify with OpenAI,
    and update matching application statuses.
    Only runs when explicitly triggered — no background scheduling.
    """
    # Fetch emails from Gmail using stored OAuth token
    emails = fetch_job_emails(
        user_id=current_user.id,
        db=db,
        max_results=payload.max_emails,
    )

    if not emails:
        return {"message": "No job-related emails found in the last 7 days", "results": {
            "emails_fetched": 0, "job_related": 0, "status_updates": 0,
            "notes_added": 0, "unmatched": 0, "low_confidence": 0, "details": [],
        }}

    try:
        results = await process_email_batch(
            user_id              = current_user.id,
            emails               = emails,
            db                   = db,
            confidence_threshold = payload.confidence_threshold,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    # Store run log — ensure all fields are always present and details is a list
    log_entry = {
        "ran_at":         datetime.utcnow().isoformat(),
        "emails_fetched": len(emails),
        "job_related":    results.get("job_related", 0),
        "status_updates": results.get("status_updates", 0),
        "notes_added":    results.get("notes_added", 0),
        "low_confidence": results.get("low_confidence", 0),
        "unmatched":      results.get("unmatched", 0),
        "details":        results.get("details") or [],
    }
    if current_user.id not in _agent_logs:
        _agent_logs[current_user.id] = []
    _agent_logs[current_user.id].insert(0, log_entry)
    _agent_logs[current_user.id] = _agent_logs[current_user.id][:20]  # keep last 20 runs

    return {"message": "Batch processed", "results": results}


@router.get("/agent/status")
def agent_status(current_user: User = Depends(get_current_user)):
    config = _agent_configs.get(current_user.id, AgentConfig())
    logs   = _agent_logs.get(current_user.id, [])
    last   = logs[0] if logs else None
    return {
        "config":     config,
        "last_run":   last,
        "total_runs": len(logs),
    }


@router.get("/agent/config")
def get_config(current_user: User = Depends(get_current_user)):
    config = _agent_configs.get(current_user.id, AgentConfig())
    return config


@router.put("/agent/config")
def update_config(
    config: AgentConfig,
    current_user: User = Depends(get_current_user),
):
    _agent_configs[current_user.id] = config
    return {"message": "Config updated", "config": config}


@router.get("/agent/log")
def agent_log(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
):
    logs = _agent_logs.get(current_user.id, [])
    # Normalize every run so details/notes_added are always safe types
    normalized = []
    for run in logs[:limit]:
        normalized.append({
            "ran_at":         run.get("ran_at", ""),
            "emails_fetched": run.get("emails_fetched", 0),
            "job_related":    run.get("job_related", 0),
            "status_updates": run.get("status_updates", 0),
            "notes_added":    run.get("notes_added", 0),
            "low_confidence": run.get("low_confidence", 0),
            "unmatched":      run.get("unmatched", 0),
            "details":        run.get("details") or [],
        })
    return {"runs": normalized}
