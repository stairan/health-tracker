from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta

from app.database import get_db
from app import schemas, models
from app.routers.garmin import get_default_user

router = APIRouter(prefix="/food", tags=["food"])


@router.post("/", response_model=schemas.FoodEntry, status_code=status.HTTP_201_CREATED)
def create_food_entry(
    entry: schemas.FoodEntryCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Create a new food or drink entry."""
    db_entry = models.FoodEntry(**entry.model_dump(), user_id=user.id)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.get("/", response_model=List[schemas.FoodEntry])
def get_food_entries(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    meal_type: Optional[str] = None,
    is_drink: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Get food entries for a date range with optional filters.
    If no dates provided, returns today's entries.
    """
    import logging
    logger = logging.getLogger(__name__)

    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date

    logger.info(f"Getting food entries: start_date={start_date}, end_date={end_date}, meal_type={meal_type}, is_drink={is_drink}")

    query = db.query(models.FoodEntry).filter(
        models.FoodEntry.user_id == user.id,
        models.FoodEntry.date >= start_date,
        models.FoodEntry.date <= end_date
    )

    if meal_type:
        query = query.filter(models.FoodEntry.meal_type == meal_type)

    if is_drink is not None:
        query = query.filter(models.FoodEntry.is_drink == is_drink)

    entries = query.order_by(models.FoodEntry.time.desc()).all()
    return entries


@router.get("/{entry_id}", response_model=schemas.FoodEntry)
def get_food_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get a specific food entry by ID."""
    entry = db.query(models.FoodEntry).filter(
        models.FoodEntry.id == entry_id,
        models.FoodEntry.user_id == user.id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food entry {entry_id} not found"
        )

    return entry


@router.put("/{entry_id}", response_model=schemas.FoodEntry)
def update_food_entry(
    entry_id: int,
    entry_update: schemas.FoodEntryUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Update a food entry."""
    db_entry = db.query(models.FoodEntry).filter(
        models.FoodEntry.id == entry_id,
        models.FoodEntry.user_id == user.id
    ).first()

    if not db_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food entry {entry_id} not found"
        )

    update_data = entry_update.model_dump(exclude_unset=True)

    # If time is updated, also update the date field to match
    if 'time' in update_data and update_data['time']:
        update_data['date'] = update_data['time'].date()

    for field, value in update_data.items():
        setattr(db_entry, field, value)

    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Delete a food entry."""
    db_entry = db.query(models.FoodEntry).filter(
        models.FoodEntry.id == entry_id,
        models.FoodEntry.user_id == user.id
    ).first()

    if not db_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Food entry {entry_id} not found"
        )

    db.delete(db_entry)
    db.commit()
    return None
