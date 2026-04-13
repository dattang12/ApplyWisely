"""
Gmail OAuth2 integration.

Flow:
  1. GET /gmail/auth        — returns Google OAuth URL (requires app auth)
  2. (browser redirects to Google)
  3. GET /gmail/callback    — exchanges code for token, stores in DB, redirects to frontend
  4. GET /gmail/status      — returns { connected, email }
  5. DELETE /gmail/disconnect — revokes + deletes stored token

fetch_job_emails(user_id, db, max_results) — used by routers_gmail.py
"""

import base64
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

# Allow HTTP redirect URIs for local development (required for localhost)
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from auth import get_current_user
from database import GmailToken, User, get_db

logger = logging.getLogger("gmail_oauth")

GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
REDIRECT_URI         = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/gmail/callback")
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:5173")

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

# In-memory state store: state_token -> {user_id, expires}
_oauth_states: dict = {}

router = APIRouter(prefix="/gmail", tags=["gmail-oauth"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_flow(state: Optional[str] = None) -> Flow:
    client_config = {
        "web": {
            "client_id":      GOOGLE_CLIENT_ID,
            "client_secret":  GOOGLE_CLIENT_SECRET,
            "auth_uri":       "https://accounts.google.com/o/oauth2/auth",
            "token_uri":      "https://oauth2.googleapis.com/token",
            "redirect_uris":  [REDIRECT_URI],
        }
    }
    kwargs = {"state": state} if state else {}
    flow = Flow.from_client_config(client_config, scopes=SCOPES, **kwargs)
    flow.redirect_uri = REDIRECT_URI
    return flow


def _build_credentials(token: GmailToken) -> Credentials:
    return Credentials(
        token=token.access_token,
        refresh_token=token.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )


def _refresh_if_needed(token: GmailToken, creds: Credentials, db: Session) -> None:
    """Refresh access token if expired, persist new token to DB."""
    if creds.expired and creds.refresh_token:
        try:
            creds.refresh(GoogleAuthRequest())
            token.access_token = creds.token
            token.token_expiry = creds.expiry
            db.commit()
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            raise HTTPException(503, "Gmail token expired and could not be refreshed — please reconnect Gmail")


def _extract_body(msg_data: dict) -> str:
    """Extract plain-text body from a Gmail API message object."""
    def _decode(data: str) -> str:
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")

    payload = msg_data.get("payload", {})

    # Single-part message
    body_data = payload.get("body", {}).get("data", "")
    if body_data:
        return _decode(body_data)

    # Multipart — prefer text/plain
    for part in payload.get("parts", []):
        if part.get("mimeType") == "text/plain":
            data = part.get("body", {}).get("data", "")
            if data:
                return _decode(data)

    # Fallback: any part with data
    for part in payload.get("parts", []):
        data = part.get("body", {}).get("data", "")
        if data:
            return _decode(data)

    return msg_data.get("snippet", "")


# ── Public fetch function (called by routers_gmail.py) ───────────────────────

def fetch_job_emails(user_id: int, db: Session, max_results: int = 50) -> list:
    """
    Fetch job-related emails from the last 7 days using the stored OAuth token.
    Returns list of { message_id, subject, body, sender, date }.
    Raises HTTP 503 if Gmail is not connected.
    """
    token = db.query(GmailToken).filter(GmailToken.user_id == user_id).first()
    if not token:
        raise HTTPException(503, "Gmail not connected — please connect Gmail to use this feature")

    creds = _build_credentials(token)
    _refresh_if_needed(token, creds, db)

    service = build("gmail", "v1", credentials=creds)
    query = (
        "subject:(application OR interview OR offer OR rejection OR "
        "position OR role OR opportunity) newer_than:7d"
    )

    result = service.users().messages().list(
        userId="me", q=query, maxResults=max_results
    ).execute()

    emails = []
    for msg in result.get("messages", []):
        try:
            msg_data = service.users().messages().get(
                userId="me", id=msg["id"], format="full"
            ).execute()
            headers = {
                h["name"]: h["value"]
                for h in msg_data.get("payload", {}).get("headers", [])
            }
            emails.append({
                "message_id": msg["id"],
                "subject":    headers.get("Subject", ""),
                "body":       _extract_body(msg_data)[:3000],
                "sender":     headers.get("From", ""),
                "date":       headers.get("Date", ""),
            })
        except Exception as e:
            logger.warning(f"Failed to fetch message {msg['id']}: {e}")

    return emails


# ── OAuth endpoints ───────────────────────────────────────────────────────────

@router.get("/auth")
def start_oauth(current_user: User = Depends(get_current_user)):
    """Return the Google OAuth URL for the frontend to redirect to."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            500,
            "Google OAuth not configured — add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env"
        )

    state = str(uuid.uuid4())

    flow = _get_flow()
    auth_url, _ = flow.authorization_url(
        state=state,
        access_type="offline",
        prompt="consent",
        include_granted_scopes="true",
    )

    # Store state + PKCE code_verifier (generated automatically by the flow)
    _oauth_states[state] = {
        "user_id":      current_user.id,
        "expires":      datetime.utcnow() + timedelta(minutes=10),
        "code_verifier": getattr(flow, "code_verifier", None),
    }

    return {"auth_url": auth_url}


@router.get("/callback")
def oauth_callback(request: Request, code: str, state: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback — exchange code, store token, redirect to frontend."""
    state_data = _oauth_states.pop(state, None)
    if not state_data or datetime.utcnow() > state_data["expires"]:
        return RedirectResponse(f"{FRONTEND_URL}?gmail_error=invalid_state")

    user_id = state_data["user_id"]

    try:
        flow = _get_flow(state=state)
        authorization_response = str(request.url)
        fetch_kwargs = {"authorization_response": authorization_response}
        if state_data.get("code_verifier"):
            fetch_kwargs["code_verifier"] = state_data["code_verifier"]
        flow.fetch_token(**fetch_kwargs)
        creds = flow.credentials

        service = build("gmail", "v1", credentials=creds)
        profile = service.users().getProfile(userId="me").execute()
        gmail_email = profile.get("emailAddress", "")
    except Exception as e:
        import traceback
        logger.error(f"OAuth callback error for user {user_id}: {e}\n{traceback.format_exc()}")
        from urllib.parse import quote
        return RedirectResponse(f"{FRONTEND_URL}?gmail_error={quote(str(e))}")

    token = db.query(GmailToken).filter(GmailToken.user_id == user_id).first()
    if not token:
        token = GmailToken(user_id=user_id)
        db.add(token)

    token.access_token  = creds.token
    token.refresh_token = creds.refresh_token or (token.refresh_token if token.id else None)
    token.token_expiry  = creds.expiry
    token.gmail_email   = gmail_email
    db.commit()

    return RedirectResponse(f"{FRONTEND_URL}?gmail_connected=true")


@router.get("/status")
def gmail_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return whether the current user has Gmail connected."""
    token = db.query(GmailToken).filter(GmailToken.user_id == current_user.id).first()
    if not token:
        return {"connected": False, "email": None}
    return {"connected": True, "email": token.gmail_email}


@router.delete("/disconnect")
def gmail_disconnect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Revoke and delete the stored Gmail OAuth token."""
    token = db.query(GmailToken).filter(GmailToken.user_id == current_user.id).first()
    if token:
        try:
            http_requests.post(
                "https://oauth2.googleapis.com/revoke",
                params={"token": token.access_token},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=5,
            )
        except Exception:
            pass  # Revocation failure is non-fatal
        db.delete(token)
        db.commit()
    return {"message": "Gmail disconnected"}
