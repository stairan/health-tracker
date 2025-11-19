from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, timedelta

from app.database import get_db
from app import schemas, models
from app.routers.garmin import get_default_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/daily/{target_date}", response_model=schemas.DailySummary)
def get_daily_summary(
    target_date: date,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get a comprehensive summary of all health data for a specific date."""

    # Garmin data
    garmin_data = db.query(models.GarminData).filter(
        models.GarminData.user_id == user.id,
        models.GarminData.date == target_date
    ).first()

    # Activities
    activities = db.query(models.Activity).filter(
        models.Activity.user_id == user.id,
        models.Activity.date == target_date
    ).all()

    # Food entries
    food_entries = db.query(models.FoodEntry).filter(
        models.FoodEntry.user_id == user.id,
        models.FoodEntry.date == target_date
    ).all()

    # Medications
    medications = db.query(models.Medication).filter(
        models.Medication.user_id == user.id,
        models.Medication.date == target_date
    ).all()

    # Sickness
    sickness_entries = db.query(models.Sickness).filter(
        models.Sickness.user_id == user.id,
        models.Sickness.date == target_date
    ).all()

    # Seizures
    seizures = db.query(models.Seizure).filter(
        models.Seizure.user_id == user.id,
        models.Seizure.date == target_date
    ).all()

    # Water intake
    water_intake = db.query(models.WaterIntake).filter(
        models.WaterIntake.user_id == user.id,
        models.WaterIntake.date == target_date
    ).all()

    # Daily note
    daily_note = db.query(models.DailyNote).filter(
        models.DailyNote.user_id == user.id,
        models.DailyNote.date == target_date
    ).first()

    # Calculate summaries
    total_calories_consumed = sum(entry.calories or 0 for entry in food_entries if not entry.is_drink)
    total_water_ml = sum(entry.amount_ml for entry in water_intake)
    total_water_ml += sum(entry.volume_ml or 0 for entry in food_entries if entry.is_drink)

    return schemas.DailySummary(
        date=target_date,
        garmin_data=garmin_data,
        activities=activities,
        food_entries=food_entries,
        medications=medications,
        sickness_entries=sickness_entries,
        seizures=seizures,
        water_intake=water_intake,
        daily_note=daily_note,
        total_calories_consumed=total_calories_consumed if total_calories_consumed > 0 else None,
        total_water_ml=total_water_ml if total_water_ml > 0 else None,
        medication_count=len(medications)
    )


@router.get("/range", response_model=schemas.DateRangeSummary)
def get_date_range_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get aggregated health data summary for a date range."""

    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    total_days = (end_date - start_date).days + 1

    # Garmin metrics
    garmin_data = db.query(models.GarminData).filter(
        models.GarminData.user_id == user.id,
        models.GarminData.date >= start_date,
        models.GarminData.date <= end_date
    ).all()

    days_with_data = len(garmin_data)

    # Calculate averages
    avg_steps = None
    avg_sleep_hours = None
    if garmin_data:
        steps_with_data = [g.steps for g in garmin_data if g.steps]
        if steps_with_data:
            avg_steps = sum(steps_with_data) / len(steps_with_data)

        sleep_with_data = [g.sleep_duration_seconds / 3600 for g in garmin_data if g.sleep_duration_seconds]
        if sleep_with_data:
            avg_sleep_hours = sum(sleep_with_data) / len(sleep_with_data)

    # Seizure count
    total_seizures = db.query(func.count(models.Seizure.id)).filter(
        models.Seizure.user_id == user.id,
        models.Seizure.date >= start_date,
        models.Seizure.date <= end_date
    ).scalar()

    # Medication count
    total_medications = db.query(func.count(models.Medication.id)).filter(
        models.Medication.user_id == user.id,
        models.Medication.date >= start_date,
        models.Medication.date <= end_date
    ).scalar()

    # Sickness days
    days_with_sickness = db.query(func.count(func.distinct(models.Sickness.date))).filter(
        models.Sickness.user_id == user.id,
        models.Sickness.date >= start_date,
        models.Sickness.date <= end_date
    ).scalar()

    return schemas.DateRangeSummary(
        start_date=start_date,
        end_date=end_date,
        total_days=total_days,
        days_with_data=days_with_data,
        avg_steps=avg_steps,
        avg_sleep_hours=avg_sleep_hours,
        total_seizures=total_seizures,
        total_medications=total_medications,
        days_with_sickness=days_with_sickness
    )


@router.get("/today", response_model=schemas.DailySummary)
def get_today_summary(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get today's health data summary."""
    return get_daily_summary(date.today(), db, user)
