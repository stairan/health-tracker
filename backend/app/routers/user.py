from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas, models
from app.routers.garmin import get_default_user
from app.utils.encryption import encrypt_password

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=schemas.User)
def get_current_user(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Get current user information."""
    return user


@router.put("/me", response_model=schemas.User)
def update_user(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """
    Update user information including Garmin credentials.
    Password will be encrypted before storage.
    """
    update_data = user_update.model_dump(exclude_unset=True)

    # Encrypt Garmin password if provided
    if "garmin_password" in update_data and update_data["garmin_password"]:
        encrypted = encrypt_password(update_data["garmin_password"])
        user.garmin_password_encrypted = encrypted
        del update_data["garmin_password"]

    # Update other fields
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.get("/garmin-configured")
def check_garmin_configured(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_default_user)
):
    """Check if Garmin credentials are configured."""
    configured = bool(user.garmin_username and user.garmin_password_encrypted)

    return {
        "configured": configured,
        "username": user.garmin_username if configured else None
    }
