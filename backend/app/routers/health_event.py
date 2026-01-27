from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app import schemas, models
from app.routers.garmin import get_default_user

router = APIRouter(prefix="/health-events", tags=["health-events"])


@router.post("/", response_model=schemas.HealthEvent, status_code=status.HTTP_201_CREATED)
def create_health_event(
    health_event: schemas.HealthEventCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Create a new health event entry."""
    db_health_event = models.HealthEvent(**health_event.model_dump(), user_id=user.id)
    db.add(db_health_event)
    db.commit()
    db.refresh(db_health_event)
    return db_health_event


@router.get("/", response_model=List[schemas.HealthEvent])
def get_health_events(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Get health event entries for a date range with optional filters.
    If no dates provided, returns today's entries.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date

    query = db.query(models.HealthEvent).filter(
        models.HealthEvent.user_id == user.id,
        models.HealthEvent.date >= start_date,
        models.HealthEvent.date <= end_date
    )

    if event_type:
        query = query.filter(models.HealthEvent.event_type == event_type)

    health_events = query.order_by(models.HealthEvent.date.desc(), models.HealthEvent.time.desc()).all()
    return health_events


@router.get("/{health_event_id}", response_model=schemas.HealthEvent)
def get_health_event(
    health_event_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get a specific health event entry by ID."""
    health_event = db.query(models.HealthEvent).filter(
        models.HealthEvent.id == health_event_id,
        models.HealthEvent.user_id == user.id
    ).first()

    if not health_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Health event {health_event_id} not found"
        )

    return health_event


@router.put("/{health_event_id}", response_model=schemas.HealthEvent)
def update_health_event(
    health_event_id: int,
    health_event_update: schemas.HealthEventUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Update a health event entry."""
    db_health_event = db.query(models.HealthEvent).filter(
        models.HealthEvent.id == health_event_id,
        models.HealthEvent.user_id == user.id
    ).first()

    if not db_health_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Health event {health_event_id} not found"
        )

    update_data = health_event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_health_event, field, value)

    db.commit()
    db.refresh(db_health_event)
    return db_health_event


@router.delete("/{health_event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_health_event(
    health_event_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Delete a health event entry."""
    db_health_event = db.query(models.HealthEvent).filter(
        models.HealthEvent.id == health_event_id,
        models.HealthEvent.user_id == user.id
    ).first()

    if not db_health_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Health event {health_event_id} not found"
        )

    db.delete(db_health_event)
    db.commit()
    return None
