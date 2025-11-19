from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.database import get_db
from app import schemas, models
from app.routers.garmin import get_default_user

router = APIRouter(prefix="/water", tags=["water"])


@router.post("/", response_model=schemas.WaterIntake, status_code=status.HTTP_201_CREATED)
def create_water_intake(
    water: schemas.WaterIntakeCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Create a new water intake entry."""
    db_water = models.WaterIntake(**water.model_dump(), user_id=user.id)
    db.add(db_water)
    db.commit()
    db.refresh(db_water)
    return db_water


@router.get("/", response_model=List[schemas.WaterIntake])
def get_water_intake(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Get water intake entries for a date range.
    If no dates provided, returns today's entries.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date

    entries = db.query(models.WaterIntake).filter(
        models.WaterIntake.user_id == user.id,
        models.WaterIntake.date >= start_date,
        models.WaterIntake.date <= end_date
    ).order_by(models.WaterIntake.time.desc()).all()

    return entries


@router.get("/daily-total/{target_date}")
def get_daily_water_total(
    target_date: date,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get total water intake for a specific date."""
    entries = db.query(models.WaterIntake).filter(
        models.WaterIntake.user_id == user.id,
        models.WaterIntake.date == target_date
    ).all()

    total_ml = sum(entry.amount_ml for entry in entries)

    return {
        "date": target_date,
        "total_ml": total_ml,
        "entry_count": len(entries)
    }


@router.delete("/{water_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_water_intake(
    water_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Delete a water intake entry."""
    db_water = db.query(models.WaterIntake).filter(
        models.WaterIntake.id == water_id,
        models.WaterIntake.user_id == user.id
    ).first()

    if not db_water:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Water intake entry {water_id} not found"
        )

    db.delete(db_water)
    db.commit()
    return None
