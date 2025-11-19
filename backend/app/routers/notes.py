from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta

from app.database import get_db
from app import schemas, models
from app.routers.garmin import get_default_user

router = APIRouter(prefix="/notes", tags=["notes"])


@router.post("/", response_model=schemas.DailyNote, status_code=status.HTTP_201_CREATED)
def create_daily_note(
    note: schemas.DailyNoteCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Create a new daily note (one per day)."""
    # Check if note already exists for this date
    existing = db.query(models.DailyNote).filter(
        models.DailyNote.user_id == user.id,
        models.DailyNote.date == note.date
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Daily note for {note.date} already exists. Use PUT to update."
        )

    db_note = models.DailyNote(**note.model_dump(), user_id=user.id)
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@router.get("/", response_model=List[schemas.DailyNote])
def get_daily_notes(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Get daily notes for a date range.
    If no dates provided, returns last 30 days.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    notes = db.query(models.DailyNote).filter(
        models.DailyNote.user_id == user.id,
        models.DailyNote.date >= start_date,
        models.DailyNote.date <= end_date
    ).order_by(models.DailyNote.date.desc()).all()

    return notes


@router.get("/{note_date}", response_model=schemas.DailyNote)
def get_daily_note_by_date(
    note_date: date,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get daily note for a specific date."""
    note = db.query(models.DailyNote).filter(
        models.DailyNote.user_id == user.id,
        models.DailyNote.date == note_date
    ).first()

    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No daily note found for {note_date}"
        )

    return note


@router.put("/{note_date}", response_model=schemas.DailyNote)
def update_daily_note(
    note_date: date,
    note_update: schemas.DailyNoteUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Update a daily note."""
    db_note = db.query(models.DailyNote).filter(
        models.DailyNote.user_id == user.id,
        models.DailyNote.date == note_date
    ).first()

    if not db_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No daily note found for {note_date}"
        )

    update_data = note_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_note, field, value)

    db.commit()
    db.refresh(db_note)
    return db_note


@router.delete("/{note_date}", status_code=status.HTTP_204_NO_CONTENT)
def delete_daily_note(
    note_date: date,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Delete a daily note."""
    db_note = db.query(models.DailyNote).filter(
        models.DailyNote.user_id == user.id,
        models.DailyNote.date == note_date
    ).first()

    if not db_note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No daily note found for {note_date}"
        )

    db.delete(db_note)
    db.commit()
    return None
