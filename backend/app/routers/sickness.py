from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app import schemas, models
from app.routers.garmin import get_default_user

router = APIRouter(prefix="/sickness", tags=["sickness"])


@router.post("/", response_model=schemas.Sickness, status_code=status.HTTP_201_CREATED)
def create_sickness_entry(
    sickness: schemas.SicknessCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Create a new sickness entry."""
    db_sickness = models.Sickness(**sickness.model_dump(), user_id=user.id)
    db.add(db_sickness)
    db.commit()
    db.refresh(db_sickness)
    return db_sickness


@router.get("/", response_model=List[schemas.Sickness])
def get_sickness_entries(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    has_fever: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Get sickness entries for a date range.
    If no dates provided, returns today's entries.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date

    query = db.query(models.Sickness).filter(
        models.Sickness.user_id == user.id,
        models.Sickness.date >= start_date,
        models.Sickness.date <= end_date
    )

    if has_fever is not None:
        query = query.filter(models.Sickness.has_fever == has_fever)

    entries = query.order_by(models.Sickness.date.desc()).all()
    return entries


@router.get("/{sickness_id}", response_model=schemas.Sickness)
def get_sickness_entry(
    sickness_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get a specific sickness entry by ID."""
    sickness = db.query(models.Sickness).filter(
        models.Sickness.id == sickness_id,
        models.Sickness.user_id == user.id
    ).first()

    if not sickness:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sickness entry {sickness_id} not found"
        )

    return sickness


@router.put("/{sickness_id}", response_model=schemas.Sickness)
def update_sickness_entry(
    sickness_id: int,
    sickness_update: schemas.SicknessUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Update a sickness entry."""
    db_sickness = db.query(models.Sickness).filter(
        models.Sickness.id == sickness_id,
        models.Sickness.user_id == user.id
    ).first()

    if not db_sickness:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sickness entry {sickness_id} not found"
        )

    update_data = sickness_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_sickness, field, value)

    db.commit()
    db.refresh(db_sickness)
    return db_sickness


@router.delete("/{sickness_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sickness_entry(
    sickness_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Delete a sickness entry."""
    db_sickness = db.query(models.Sickness).filter(
        models.Sickness.id == sickness_id,
        models.Sickness.user_id == user.id
    ).first()

    if not db_sickness:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sickness entry {sickness_id} not found"
        )

    db.delete(db_sickness)
    db.commit()
    return None
