from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from database import ApplicationStatus


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    created_at: datetime
    class Config: from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


# ── Resume ────────────────────────────────────────────────────────────────────

class ResumeCreate(BaseModel):
    label: Optional[str] = "Base Resume"
    raw_text: str
    is_base: Optional[int] = 1

class ResumeOut(BaseModel):
    id: int
    label: str
    raw_text: str
    structured_json: Optional[str]
    is_base: int
    created_at: datetime
    class Config: from_attributes = True


# ── Tailor ────────────────────────────────────────────────────────────────────

class TailorRequest(BaseModel):
    resume_id: int
    job_description: str
    company: Optional[str] = "Unknown"
    role: Optional[str] = "Unknown"

class TailorResponse(BaseModel):
    tailored_text: str
    application_id: int


# ── Phase 2 ───────────────────────────────────────────────────────────────────

class StatusEventOut(BaseModel):
    id: int
    from_status: Optional[ApplicationStatus]
    to_status: ApplicationStatus
    note: Optional[str]
    occurred_at: datetime
    class Config: from_attributes = True

class NoteCreate(BaseModel):
    body: str

class NoteOut(BaseModel):
    id: int
    body: str
    created_at: datetime
    class Config: from_attributes = True

class ApplicationCreate(BaseModel):
    company: str
    role: str
    status: Optional[ApplicationStatus] = ApplicationStatus.applied
    notes: Optional[str] = None

class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None

class ApplicationOut(BaseModel):
    id: int
    company: str
    role: str
    status: ApplicationStatus
    notes: Optional[str]
    tailored_resume_text: Optional[str]
    applied_at: datetime
    updated_at: datetime
    job_posting_id: Optional[int] = None
    class Config: from_attributes = True

class ApplicationDetail(ApplicationOut):
    status_events: List[StatusEventOut] = []
    notes_list: List[NoteOut] = []
    resume_id: Optional[int]
    class Config: from_attributes = True

class DashboardStats(BaseModel):
    total: int
    by_status: dict
    recent_activity: List[dict]
    response_rate: float


# ── Phase 3 ───────────────────────────────────────────────────────────────────

class WatchedCompanyCreate(BaseModel):
    name: str
    search_query: Optional[str] = None
    active: Optional[bool] = True

class WatchedCompanyOut(BaseModel):
    id: int
    name: str
    search_query: str
    active: bool
    created_at: datetime
    class Config: from_attributes = True

class JobPostingOut(BaseModel):
    id: int
    watched_company_id: int
    title: str
    company: str
    location: Optional[str]
    url: Optional[str]
    snippet: Optional[str]
    source: str
    is_new: bool
    scraped_at: datetime
    class Config: from_attributes = True

class ScrapeResult(BaseModel):
    scraped: int
    new_postings: int
    companies: List[dict]

class OneClickApplyRequest(BaseModel):
    resume_id: int

class OneClickApplyResponse(BaseModel):
    application_id: int
    tailored_text: str
    posting_url: Optional[str]
