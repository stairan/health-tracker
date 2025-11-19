from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta

from app.database import get_db
from app import schemas, models
from app.services.garmin_service import sync_garmin_data

router = APIRouter(prefix="/garmin", tags=["garmin"])


# For simplicity in single-user app, we'll use user_id = 1
# In a multi-user app, this would come from authentication
DEFAULT_USER_ID = 1


def get_default_user(db: Session = Depends(get_db)) -> models.User:
    """Get the default user (or create if doesn't exist)."""
    user = db.query(models.User).filter(models.User.id == DEFAULT_USER_ID).first()
    if not user:
        user = models.User(id=DEFAULT_USER_ID, username="default_user")
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


@router.post("/sync", response_model=schemas.GarminSyncResponse)
def sync_garmin(
    request: schemas.GarminSyncRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Manually trigger Garmin data synchronization for a specific date.
    If no date provided, syncs yesterday's data.
    """
    # Parse date string if provided
    if request.date:
        try:
            sync_date = date.fromisoformat(request.date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date format: {request.date}. Expected YYYY-MM-DD"
            )
    else:
        sync_date = date.today() - timedelta(days=1)

    result = sync_garmin_data(db, user, sync_date, request.force)

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result["message"]
        )

    return schemas.GarminSyncResponse(**result)


@router.get("/data", response_model=List[schemas.GarminData])
def get_garmin_data(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Get Garmin data for a date range.
    If no dates provided, returns last 30 days.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    data = db.query(models.GarminData).filter(
        models.GarminData.user_id == user.id,
        models.GarminData.date >= start_date,
        models.GarminData.date <= end_date
    ).order_by(models.GarminData.date.desc()).all()

    return data


@router.get("/data/{data_date}", response_model=schemas.GarminData)
def get_garmin_data_by_date(
    data_date: date,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get Garmin data for a specific date."""
    data = db.query(models.GarminData).filter(
        models.GarminData.user_id == user.id,
        models.GarminData.date == data_date
    ).first()

    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No Garmin data found for {data_date}"
        )

    return data


@router.get("/activities", response_model=List[schemas.Activity])
def get_activities(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Get activities/workouts for a date range.
    If no dates provided, returns last 30 days.
    """
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    activities = db.query(models.Activity).filter(
        models.Activity.user_id == user.id,
        models.Activity.date >= start_date,
        models.Activity.date <= end_date
    ).order_by(models.Activity.start_time.desc()).all()

    return activities


@router.get("/sync-log", response_model=List[schemas.GarminSyncResponse])
def get_sync_log(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get recent Garmin sync attempts."""
    logs = db.query(models.GarminSyncLog).filter(
        models.GarminSyncLog.user_id == user.id
    ).order_by(models.GarminSyncLog.sync_timestamp.desc()).limit(limit).all()

    return [
        schemas.GarminSyncResponse(
            success=log.success,
            message=log.error_message or "Sync successful",
            date=log.sync_date,
            data_types_synced=log.data_types_synced or [],
            errors={"error": log.error_message} if log.error_message else None
        )
        for log in logs
    ]
