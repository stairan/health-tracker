from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta, datetime

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
    """
    Create a new food or drink entry.

    If food_database_id is provided, the nutritional info is pulled from the food database
    and the database entry's usage stats are updated.

    If save_to_database is True (default) and no food_database_id is provided,
    a new entry will be added to the food database for future quick logging.
    """
    entry_data = entry.model_dump(exclude={"food_database_id", "save_to_database"})
    food_database_id = entry.food_database_id
    save_to_database = entry.save_to_database

    # If using food from database, get nutritional info from there
    if food_database_id:
        db_food = db.query(models.FoodDatabase).filter(
            models.FoodDatabase.id == food_database_id,
            models.FoodDatabase.user_id == user.id
        ).first()

        if not db_food:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Food database entry {food_database_id} not found"
            )

        # Override nutritional info from database (allow manual overrides if provided)
        if entry_data.get("description") == "" or not entry_data.get("description"):
            entry_data["description"] = db_food.name
        if entry_data.get("calories") is None:
            entry_data["calories"] = db_food.calories
        if entry_data.get("protein_grams") is None:
            entry_data["protein_grams"] = db_food.protein_grams
        if entry_data.get("carbs_grams") is None:
            entry_data["carbs_grams"] = db_food.carbs_grams
        if entry_data.get("fat_grams") is None:
            entry_data["fat_grams"] = db_food.fat_grams
        if entry_data.get("is_drink") is None:
            entry_data["is_drink"] = db_food.is_drink
        if entry_data.get("volume_ml") is None:
            entry_data["volume_ml"] = db_food.volume_ml

        # Update usage stats
        db_food.times_logged += 1
        db_food.last_used = datetime.utcnow()
        db_food.updated_at = datetime.utcnow()

    # Create the food entry
    db_entry = models.FoodEntry(
        **entry_data,
        user_id=user.id,
        food_database_id=food_database_id
    )
    db.add(db_entry)

    # Save to food database if requested and not already from database
    if save_to_database and not food_database_id:
        # Check if similar food already exists
        existing_food = db.query(models.FoodDatabase).filter(
            models.FoodDatabase.user_id == user.id,
            models.FoodDatabase.name.ilike(entry_data["description"])
        ).first()

        if not existing_food:
            # Create new food database entry
            new_food = models.FoodDatabase(
                user_id=user.id,
                name=entry_data["description"],
                serving_size=None,  # Can be enhanced later
                calories=entry_data.get("calories"),
                protein_grams=entry_data.get("protein_grams"),
                carbs_grams=entry_data.get("carbs_grams"),
                fat_grams=entry_data.get("fat_grams"),
                is_drink=entry_data.get("is_drink", False),
                volume_ml=entry_data.get("volume_ml"),
                times_logged=1,
                last_used=datetime.utcnow()
            )
            db.add(new_food)
            db.flush()  # Get the ID
            db_entry.food_database_id = new_food.id
        else:
            # Update existing food stats
            existing_food.times_logged += 1
            existing_food.last_used = datetime.utcnow()
            existing_food.updated_at = datetime.utcnow()
            db_entry.food_database_id = existing_food.id

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
