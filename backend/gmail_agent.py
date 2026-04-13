"""
Gmail Tracker Agent — reads the user's inbox via Gmail MCP,
classifies job-related emails with Ollama, and auto-updates
the application tracker.

Architecture:
  - This module contains the pure classification + matching logic.
  - It is called by routers_gmail.py (manual trigger) and
    scheduler.py (every 30 min).
  - Gmail is accessed via the MCP server — no OAuth app needed.
    The FastAPI backend proxies MCP calls through the /gmail/run
    endpoint which the frontend artifact calls with the user's
    already-authenticated Gmail MCP session.

Email → status mapping:
  acknowledgement  → no status change, add a note
  interview        → applied → interview
  rejection        → any → rejected
  offer            → any → offer
  unknown          → skip, log as unrecognised
"""

import json
import logging
import os
import re
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from openai import AsyncOpenAI

from database import (
    Application, ApplicationStatus, StatusEvent,
    ApplicationNote, SessionLocal
)

logger = logging.getLogger("gmail_agent")

OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ── Classifier prompt ─────────────────────────────────────────────────────────

CLASSIFIER_SYSTEM = """You are a job application email classifier.
Given an email subject and body, extract structured information about the job application status.

You MUST respond with valid JSON only — no markdown, no explanation, nothing else.

Return this exact structure:
{
  "is_job_related": true or false,
  "company": "company name or null",
  "role": "job title or null",
  "signal": "acknowledgement" | "interview" | "offer" | "rejection" | "unknown",
  "confidence": 0.0 to 1.0,
  "summary": "one sentence describing what this email says"
}

Signal definitions:
- acknowledgement: they received the application, still reviewing ("thank you for applying", "we received your application")
- interview: they want to schedule a call or interview ("we'd like to move forward", "schedule an interview", "next steps")
- offer: they are offering the job ("pleased to offer", "offer letter", "compensation package")
- rejection: they are not moving forward ("we have decided", "not moving forward", "other candidates", "regret to inform")
- unknown: job-related but unclear signal
"""


async def classify_email(subject: str, body: str) -> dict:
    """Send email to OpenAI for classification. Returns parsed dict."""
    prompt = f"EMAIL SUBJECT: {subject}\n\nEMAIL BODY:\n{body[:3000]}"

    response = await _client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": CLASSIFIER_SYSTEM},
            {"role": "user",   "content": prompt},
        ],
        timeout=60.0,
    )
    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if model adds them
    raw = re.sub(r"^```json\s*|^```\s*|\s*```$", "", raw, flags=re.MULTILINE).strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning(f"Classifier returned non-JSON: {raw[:200]}")
        return {
            "is_job_related": False,
            "company": None,
            "role": None,
            "signal": "unknown",
            "confidence": 0.0,
            "summary": "Failed to parse classifier response",
        }


# ── Application matching ──────────────────────────────────────────────────────

def find_matching_application(
    db: Session,
    user_id: int,
    company: Optional[str],
    role: Optional[str],
) -> Optional[Application]:
    """
    Find the best matching open application for this user.
    Matching priority:
      1. company name + role title (fuzzy, case-insensitive)
      2. company name only
      3. None (couldn't match)
    """
    if not company:
        return None

    apps = (
        db.query(Application)
        .filter(
            Application.user_id == user_id,
            Application.status.notin_([ApplicationStatus.rejected, ApplicationStatus.offer]),
        )
        .all()
    )

    company_lower = company.lower().strip()
    role_lower    = (role or "").lower().strip()

    # Try company + role match first
    if role_lower:
        for app in apps:
            if (company_lower in app.company.lower() or app.company.lower() in company_lower):
                if role_lower in app.role.lower() or app.role.lower() in role_lower:
                    return app

    # Fall back to company-only match
    for app in apps:
        if company_lower in app.company.lower() or app.company.lower() in company_lower:
            return app

    return None


# ── Status update logic ───────────────────────────────────────────────────────

SIGNAL_TO_STATUS = {
    "acknowledgement": ApplicationStatus.applied,   # confirmation email → applied
    "interview":       ApplicationStatus.interview,
    "offer":           ApplicationStatus.offer,
    "rejection":       ApplicationStatus.rejected,
}


def apply_email_signal(
    db: Session,
    app: Application,
    signal: str,
    summary: str,
    email_subject: str,
    confidence: float,
) -> dict:
    """
    Apply the classified signal to the matched application.
    Returns a dict describing what changed.
    """
    note_body = f"[Gmail Agent] {summary}\n\nEmail subject: \"{email_subject}\"\nConfidence: {round(confidence * 100)}%"

    # Always add a note regardless of status change
    note = ApplicationNote(application_id=app.id, body=note_body)
    db.add(note)

    new_status = SIGNAL_TO_STATUS.get(signal)

    if new_status is None or new_status == app.status:
        # Acknowledgement or same status — just note, no status change
        db.commit()
        return {
            "action": "noted",
            "application_id": app.id,
            "company": app.company,
            "role": app.role,
            "signal": signal,
            "status_changed": False,
        }

    # Status transition
    old_status = app.status
    event = StatusEvent(
        application_id=app.id,
        from_status=old_status,
        to_status=new_status,
        note=f"Auto-updated by Gmail Agent — {summary}",
    )
    db.add(event)
    app.status     = new_status
    app.updated_at = datetime.utcnow()
    db.commit()

    return {
        "action":          "status_updated",
        "application_id":  app.id,
        "company":         app.company,
        "role":            app.role,
        "signal":          signal,
        "status_changed":  True,
        "from_status":     old_status.value,
        "to_status":       new_status.value,
    }


# ── Main entry point ──────────────────────────────────────────────────────────

async def process_email_batch(
    user_id: int,
    emails: list,
    db: Session,
    confidence_threshold: float = 0.65,
) -> dict:
    """
    Process a batch of emails (dicts with 'subject', 'body', 'message_id').
    Returns summary of what was processed.
    """
    results = {
        "processed": 0,
        "job_related": 0,
        "status_updates": 0,
        "notes_added": 0,
        "unmatched": 0,
        "low_confidence": 0,
        "details": [],
    }

    for email in emails:
        subject    = email.get("subject", "")
        body       = email.get("body", "")
        message_id = email.get("message_id", "")

        results["processed"] += 1

        try:
            classification = await classify_email(subject, body)
        except Exception as e:
            logger.error(f"Classification failed for message {message_id}: {e}")
            continue

        if not classification.get("is_job_related"):
            continue

        results["job_related"] += 1
        confidence = classification.get("confidence", 0)

        if confidence < confidence_threshold:
            results["low_confidence"] += 1
            results["details"].append({
                "message_id": message_id,
                "subject":    subject[:80],
                "action":     "skipped_low_confidence",
                "confidence": confidence,
                "summary":    classification.get("summary", ""),
            })
            continue

        app = find_matching_application(
            db,
            user_id,
            classification.get("company"),
            classification.get("role"),
        )

        if not app:
            results["unmatched"] += 1
            results["details"].append({
                "message_id": message_id,
                "subject":    subject[:80],
                "action":     "unmatched",
                "company":    classification.get("company"),
                "signal":     classification.get("signal"),
                "summary":    classification.get("summary", ""),
            })
            continue

        outcome = apply_email_signal(
            db,
            app,
            signal       = classification.get("signal", "unknown"),
            summary      = classification.get("summary", ""),
            email_subject= subject,
            confidence   = confidence,
        )

        if outcome["status_changed"]:
            results["status_updates"] += 1
        else:
            results["notes_added"] += 1

        results["details"].append({**outcome, "message_id": message_id, "subject": subject[:80]})

    return results
