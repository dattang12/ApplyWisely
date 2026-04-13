from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List
from datetime import datetime

from database import get_db, Application, ApplicationNote, StatusEvent, User, ApplicationStatus
from schemas import ApplicationOut, ApplicationDetail, ApplicationCreate, ApplicationUpdate, NoteCreate, NoteOut, DashboardStats
from auth import get_current_user

router = APIRouter(prefix="/applications", tags=["applications"])


def _log_status_event(db, app_id: int, from_status, to_status, note: str = None):
    event = StatusEvent(
        application_id=app_id,
        from_status=from_status,
        to_status=to_status,
        note=note,
    )
    db.add(event)


# ── List & stats ──────────────────────────────────────────────────────────────

@router.get("/", response_model=List[ApplicationOut])
def list_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Application)
        .filter(Application.user_id == current_user.id)
        .order_by(Application.applied_at.desc())
        .all()
    )


@router.get("/dashboard", response_model=DashboardStats)
def dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    apps = db.query(Application).filter(Application.user_id == current_user.id).all()
    total = len(apps)
    by_status = {s.value: 0 for s in ApplicationStatus}
    advanced = 0
    for a in apps:
        by_status[a.status.value] += 1
        if a.status != ApplicationStatus.applied:
            advanced += 1

    response_rate = round((advanced / total * 100) if total else 0, 1)

    # Last 10 status events across all user apps
    app_ids = [a.id for a in apps]
    recent_raw = []
    if app_ids:
        recent_raw = (
            db.query(StatusEvent)
            .filter(StatusEvent.application_id.in_(app_ids))
            .order_by(desc(StatusEvent.occurred_at))
            .limit(10)
            .all()
        )

    # Build activity list with company/role context
    app_map = {a.id: a for a in apps}
    recent_activity = []
    for ev in recent_raw:
        a = app_map.get(ev.application_id)
        recent_activity.append({
            "application_id": ev.application_id,
            "company": a.company if a else "?",
            "role": a.role if a else "?",
            "from_status": ev.from_status.value if ev.from_status else None,
            "to_status": ev.to_status.value,
            "occurred_at": ev.occurred_at.isoformat(),
        })

    return DashboardStats(
        total=total,
        by_status=by_status,
        recent_activity=recent_activity,
        response_rate=response_rate,
    )


# ── Create application ────────────────────────────────────────────────────────

@router.post("/", response_model=ApplicationOut, status_code=201)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = Application(
        user_id=current_user.id,
        company=payload.company,
        role=payload.role,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    _log_status_event(db, app.id, None, app.status)
    db.commit()
    return app


# ── Single application ────────────────────────────────────────────────────────

@router.get("/{app_id}", response_model=ApplicationDetail)
def get_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = (
        db.query(Application)
        .options(joinedload(Application.status_events), joinedload(Application.notes_list))
        .filter(Application.id == app_id, Application.user_id == current_user.id)
        .first()
    )
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.patch("/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(
        Application.id == app_id, Application.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if payload.status is not None and payload.status != app.status:
        _log_status_event(db, app.id, app.status, payload.status)
        app.status = payload.status

    if payload.notes is not None:
        app.notes = payload.notes

    app.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(app)
    return app


@router.delete("/{app_id}", status_code=204)
def delete_application(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(
        Application.id == app_id, Application.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(app)
    db.commit()


# ── Notes CRUD ────────────────────────────────────────────────────────────────

@router.get("/{app_id}/notes", response_model=List[NoteOut])
def list_notes(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(
        Application.id == app_id, Application.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return (
        db.query(ApplicationNote)
        .filter(ApplicationNote.application_id == app_id)
        .order_by(ApplicationNote.created_at.desc())
        .all()
    )


@router.post("/{app_id}/notes", response_model=NoteOut, status_code=201)
def add_note(
    app_id: int,
    payload: NoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(
        Application.id == app_id, Application.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    note = ApplicationNote(application_id=app_id, body=payload.body)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{app_id}/notes/{note_id}", status_code=204)
def delete_note(
    app_id: int,
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(
        Application.id == app_id, Application.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    note = db.query(ApplicationNote).filter(
        ApplicationNote.id == note_id,
        ApplicationNote.application_id == app_id,
    ).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    db.delete(note)
    db.commit()


# ── Status timeline ───────────────────────────────────────────────────────────

@router.get("/{app_id}/timeline")
def get_timeline(
    app_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    app = db.query(Application).filter(
        Application.id == app_id, Application.user_id == current_user.id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    events = (
        db.query(StatusEvent)
        .filter(StatusEvent.application_id == app_id)
        .order_by(StatusEvent.occurred_at)
        .all()
    )
    return [
        {
            "id": e.id,
            "from_status": e.from_status.value if e.from_status else None,
            "to_status": e.to_status.value,
            "note": e.note,
            "occurred_at": e.occurred_at.isoformat(),
        }
        for e in events
    ]
