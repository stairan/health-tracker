from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app import schemas, models
from app.routers.garmin import get_default_user

router = APIRouter(prefix="/medications", tags=["medications"])


@router.post("/", response_model=schemas.Medication, status_code=status.HTTP_201_CREATED)
def create_medication(
    medication: schemas.MedicationCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Create a new medication entry."""
    db_medication = models.Medication(**medication.model_dump(), user_id=user.id)
    db.add(db_medication)
    db.commit()
    db.refresh(db_medication)
    return db_medication


@router.get("/", response_model=List[schemas.Medication])
def get_medications(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    medication_name: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Get medication entries for a date range.
    If no dates provided, returns today's entries.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date

    query = db.query(models.Medication).filter(
        models.Medication.user_id == user.id,
        models.Medication.date >= start_date,
        models.Medication.date <= end_date
    )

    if medication_name:
        query = query.filter(models.Medication.medication_name.ilike(f"%{medication_name}%"))

    medications = query.order_by(models.Medication.time.desc()).all()
    return medications


# Medication Schedule endpoints (must come before /{medication_id} routes)

@router.post("/schedules", response_model=schemas.MedicationSchedule, status_code=status.HTTP_201_CREATED)
def create_medication_schedule(
    schedule: schemas.MedicationScheduleCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Create a new medication schedule for regular medications."""
    db_schedule = models.MedicationSchedule(**schedule.model_dump(), user_id=user.id)
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@router.get("/schedules", response_model=List[schemas.MedicationSchedule])
def get_medication_schedules(
    active_only: bool = True,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get all medication schedules."""
    query = db.query(models.MedicationSchedule).filter(
        models.MedicationSchedule.user_id == user.id
    )

    if active_only:
        query = query.filter(models.MedicationSchedule.is_active == True)

    schedules = query.order_by(models.MedicationSchedule.medication_name).all()
    return schedules


@router.get("/schedules/{schedule_id}", response_model=schemas.MedicationSchedule)
def get_medication_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get a specific medication schedule by ID."""
    schedule = db.query(models.MedicationSchedule).filter(
        models.MedicationSchedule.id == schedule_id,
        models.MedicationSchedule.user_id == user.id
    ).first()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medication schedule {schedule_id} not found"
        )

    return schedule


@router.put("/schedules/{schedule_id}", response_model=schemas.MedicationSchedule)
def update_medication_schedule(
    schedule_id: int,
    schedule_update: schemas.MedicationScheduleUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Update a medication schedule."""
    db_schedule = db.query(models.MedicationSchedule).filter(
        models.MedicationSchedule.id == schedule_id,
        models.MedicationSchedule.user_id == user.id
    ).first()

    if not db_schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medication schedule {schedule_id} not found"
        )

    update_data = schedule_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_schedule, field, value)

    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@router.delete("/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Delete a medication schedule."""
    db_schedule = db.query(models.MedicationSchedule).filter(
        models.MedicationSchedule.id == schedule_id,
        models.MedicationSchedule.user_id == user.id
    ).first()

    if not db_schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medication schedule {schedule_id} not found"
        )

    db.delete(db_schedule)
    db.commit()
    return None


# Single medication endpoints (must come after /schedules routes)

@router.get("/{medication_id}", response_model=schemas.Medication)
def get_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get a specific medication entry by ID."""
    medication = db.query(models.Medication).filter(
        models.Medication.id == medication_id,
        models.Medication.user_id == user.id
    ).first()

    if not medication:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medication entry {medication_id} not found"
        )

    return medication


@router.put("/{medication_id}", response_model=schemas.Medication)
def update_medication(
    medication_id: int,
    medication_update: schemas.MedicationUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Update a medication entry."""
    db_medication = db.query(models.Medication).filter(
        models.Medication.id == medication_id,
        models.Medication.user_id == user.id
    ).first()

    if not db_medication:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medication entry {medication_id} not found"
        )

    update_data = medication_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_medication, field, value)

    db.commit()
    db.refresh(db_medication)
    return db_medication


@router.delete("/{medication_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_medication(
    medication_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Delete a medication entry."""
    db_medication = db.query(models.Medication).filter(
        models.Medication.id == medication_id,
        models.Medication.user_id == user.id
    ).first()

    if not db_medication:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medication entry {medication_id} not found"
        )

    db.delete(db_medication)
    db.commit()
    return None
