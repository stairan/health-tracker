from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app import schemas, models
from app.routers.garmin import get_default_user

router = APIRouter(prefix="/seizures", tags=["seizures"])


@router.post("/", response_model=schemas.Seizure, status_code=status.HTTP_201_CREATED)
def create_seizure(
    seizure: schemas.SeizureCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Create a new seizure entry."""
    db_seizure = models.Seizure(**seizure.model_dump(), user_id=user.id)
    db.add(db_seizure)
    db.commit()
    db.refresh(db_seizure)
    return db_seizure


@router.get("/", response_model=List[schemas.Seizure])
def get_seizures(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    severity: Optional[str] = None,
    seizure_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Get seizure entries for a date range with optional filters.
    If no dates provided, returns today's entries.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date

    query = db.query(models.Seizure).filter(
        models.Seizure.user_id == user.id,
        models.Seizure.date >= start_date,
        models.Seizure.date <= end_date
    )

    if severity:
        query = query.filter(models.Seizure.severity == severity)

    if seizure_type:
        query = query.filter(models.Seizure.seizure_type == seizure_type)

    seizures = query.order_by(models.Seizure.time.desc()).all()
    return seizures


@router.get("/{seizure_id}", response_model=schemas.Seizure)
def get_seizure(
    seizure_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get a specific seizure entry by ID."""
    seizure = db.query(models.Seizure).filter(
        models.Seizure.id == seizure_id,
        models.Seizure.user_id == user.id
    ).first()

    if not seizure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Seizure entry {seizure_id} not found"
        )

    return seizure


@router.put("/{seizure_id}", response_model=schemas.Seizure)
def update_seizure(
    seizure_id: int,
    seizure_update: schemas.SeizureUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Update a seizure entry."""
    db_seizure = db.query(models.Seizure).filter(
        models.Seizure.id == seizure_id,
        models.Seizure.user_id == user.id
    ).first()

    if not db_seizure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Seizure entry {seizure_id} not found"
        )

    update_data = seizure_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_seizure, field, value)

    db.commit()
    db.refresh(db_seizure)
    return db_seizure


@router.delete("/{seizure_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_seizure(
    seizure_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Delete a seizure entry."""
    db_seizure = db.query(models.Seizure).filter(
        models.Seizure.id == seizure_id,
        models.Seizure.user_id == user.id
    ).first()

    if not db_seizure:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Seizure entry {seizure_id} not found"
        )

    db.delete(db_seizure)
    db.commit()
    return None
