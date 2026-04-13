from sqlalchemy import (
    create_engine, Column, Integer, String, Text,
    DateTime, ForeignKey, Enum, Boolean
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./resume_tailor.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class ApplicationStatus(str, enum.Enum):
    tailored  = "tailored"   # not yet submitted (displayed as "Not Applied" in UI)
    applied   = "applied"    # application submitted (confirmed by Gmail or manual)
    interview = "interview"
    offer     = "offer"
    rejected  = "rejected"


# ── Phase 1 models ────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name       = Column(String, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    resumes      = relationship("Resume",      back_populates="owner", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="owner", cascade="all, delete-orphan")
    watchlist    = relationship("WatchedCompany", back_populates="owner", cascade="all, delete-orphan")


class Resume(Base):
    __tablename__ = "resumes"
    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    label          = Column(String, default="Base Resume")
    raw_text       = Column(Text, nullable=False)
    structured_json= Column(Text, nullable=True)
    is_base        = Column(Integer, default=1)
    created_at     = Column(DateTime, default=datetime.utcnow)

    owner        = relationship("User", back_populates="resumes")
    applications = relationship("Application", back_populates="tailored_resume")


class Application(Base):
    __tablename__ = "applications"
    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=False)
    resume_id           = Column(Integer, ForeignKey("resumes.id"), nullable=True)
    job_posting_id      = Column(Integer, ForeignKey("job_postings.id"), nullable=True)   # Phase 3
    company             = Column(String, nullable=False)
    role                = Column(String, nullable=False)
    job_description     = Column(Text, nullable=True)
    tailored_resume_text= Column(Text, nullable=True)
    status              = Column(Enum(ApplicationStatus), default=ApplicationStatus.applied)
    notes               = Column(Text, nullable=True)
    applied_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner          = relationship("User", back_populates="applications")
    tailored_resume= relationship("Resume", back_populates="applications")
    job_posting    = relationship("JobPosting", back_populates="applications")
    status_events  = relationship("StatusEvent",      back_populates="application", cascade="all, delete-orphan", order_by="StatusEvent.occurred_at")
    notes_list     = relationship("ApplicationNote",  back_populates="application", cascade="all, delete-orphan", order_by="ApplicationNote.created_at.desc()")


# ── Phase 2 models ────────────────────────────────────────────────────────────

class StatusEvent(Base):
    __tablename__ = "status_events"
    id             = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    from_status    = Column(Enum(ApplicationStatus), nullable=True)
    to_status      = Column(Enum(ApplicationStatus), nullable=False)
    note           = Column(String, nullable=True)
    occurred_at    = Column(DateTime, default=datetime.utcnow)
    application    = relationship("Application", back_populates="status_events")


class ApplicationNote(Base):
    __tablename__ = "application_notes"
    id             = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    body           = Column(Text, nullable=False)
    created_at     = Column(DateTime, default=datetime.utcnow)
    application    = relationship("Application", back_populates="notes_list")


# ── Phase 3 models ────────────────────────────────────────────────────────────

class WatchedCompany(Base):
    """Companies the user wants to monitor for new job postings."""
    __tablename__ = "watched_companies"
    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    name         = Column(String, nullable=False)           # display name
    search_query = Column(String, nullable=False)           # term used for scraping
    active       = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    owner    = relationship("User", back_populates="watchlist")
    postings = relationship("JobPosting", back_populates="watched_company", cascade="all, delete-orphan")


class JobPosting(Base):
    """A scraped job posting surfaced from a watched company."""
    __tablename__ = "job_postings"
    id                 = Column(Integer, primary_key=True, index=True)
    watched_company_id = Column(Integer, ForeignKey("watched_companies.id"), nullable=False)
    title              = Column(String, nullable=False)
    company            = Column(String, nullable=False)
    location           = Column(String, nullable=True)
    url                = Column(String, nullable=True)
    snippet            = Column(Text, nullable=True)     # short description / preview
    full_description   = Column(Text, nullable=True)    # fetched on demand
    source             = Column(String, default="remotive")  # which board it came from
    external_id        = Column(String, nullable=True)  # de-dup key from source
    is_new             = Column(Boolean, default=True)  # unread flag
    scraped_at         = Column(DateTime, default=datetime.utcnow)

    watched_company = relationship("WatchedCompany", back_populates="postings")
    applications    = relationship("Application", back_populates="job_posting")


# ── Phase 4 models ────────────────────────────────────────────────────────────

class GmailToken(Base):
    """Stored OAuth token for Gmail API access per user."""
    __tablename__ = "gmail_tokens"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    access_token  = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_expiry  = Column(DateTime, nullable=True)
    gmail_email   = Column(String, nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User")


# ── DB helpers ────────────────────────────────────────────────────────────────

def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
