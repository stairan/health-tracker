from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import FoodDatabase as FoodDatabaseModel, User
from app.schemas import FoodDatabase, FoodDatabaseCreate, FoodDatabaseUpdate

router = APIRouter(prefix="/food-database", tags=["food-database"])


# Hardcoded user ID (since no auth yet)
CURRENT_USER_ID = 1


@router.get("/", response_model=List[FoodDatabase])
def get_food_database(
    search: Optional[str] = None,
    is_drink: Optional[bool] = None,
    favorites_only: bool = False,
    sort_by: str = Query("frequent", description="frequent, recent, alphabetical"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all foods from the user's food database.

    - **search**: Filter by name (case-insensitive)
    - **is_drink**: Filter by drink vs food
    - **favorites_only**: Show only favorited items
    - **sort_by**: Sort by frequency (times_logged), recent (last_used), or alphabetical (name)
    """
    query = db.query(FoodDatabaseModel).filter(
        FoodDatabaseModel.user_id == CURRENT_USER_ID
    )

    # Apply filters
    if search:
        query = query.filter(FoodDatabaseModel.name.ilike(f"%{search}%"))

    if is_drink is not None:
        query = query.filter(FoodDatabaseModel.is_drink == is_drink)

    if favorites_only:
        query = query.filter(FoodDatabaseModel.is_favorite == True)

    # Apply sorting
    if sort_by == "frequent":
        query = query.order_by(FoodDatabaseModel.times_logged.desc())
    elif sort_by == "recent":
        query = query.order_by(FoodDatabaseModel.last_used.desc().nullslast())
    elif sort_by == "alphabetical":
        query = query.order_by(FoodDatabaseModel.name)

    foods = query.offset(skip).limit(limit).all()
    return foods


@router.get("/{food_id}", response_model=FoodDatabase)
def get_food(food_id: int, db: Session = Depends(get_db)):
    """Get a specific food from the database."""
    food = db.query(FoodDatabaseModel).filter(
        FoodDatabaseModel.id == food_id,
        FoodDatabaseModel.user_id == CURRENT_USER_ID
    ).first()

    if not food:
        raise HTTPException(status_code=404, detail="Food not found")

    return food


@router.post("/", response_model=FoodDatabase)
def create_food(food: FoodDatabaseCreate, db: Session = Depends(get_db)):
    """Add a new food to the database."""
    # Check if food with same name already exists for this user
    existing = db.query(FoodDatabaseModel).filter(
        FoodDatabaseModel.user_id == CURRENT_USER_ID,
        FoodDatabaseModel.name.ilike(food.name)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Food '{food.name}' already exists in your database"
        )

    db_food = FoodDatabaseModel(
        user_id=CURRENT_USER_ID,
        **food.model_dump()
    )
    db.add(db_food)
    db.commit()
    db.refresh(db_food)

    return db_food


@router.put("/{food_id}", response_model=FoodDatabase)
def update_food(
    food_id: int,
    food: FoodDatabaseUpdate,
    db: Session = Depends(get_db)
):
    """Update a food in the database."""
    db_food = db.query(FoodDatabaseModel).filter(
        FoodDatabaseModel.id == food_id,
        FoodDatabaseModel.user_id == CURRENT_USER_ID
    ).first()

    if not db_food:
        raise HTTPException(status_code=404, detail="Food not found")

    # Update fields
    update_data = food.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_food, field, value)

    db_food.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_food)

    return db_food


@router.delete("/{food_id}")
def delete_food(food_id: int, db: Session = Depends(get_db)):
    """Delete a food from the database."""
    db_food = db.query(FoodDatabaseModel).filter(
        FoodDatabaseModel.id == food_id,
        FoodDatabaseModel.user_id == CURRENT_USER_ID
    ).first()

    if not db_food:
        raise HTTPException(status_code=404, detail="Food not found")

    db.delete(db_food)
    db.commit()

    return {"success": True, "message": "Food deleted successfully"}


@router.post("/{food_id}/favorite")
def toggle_favorite(food_id: int, db: Session = Depends(get_db)):
    """Toggle favorite status for a food."""
    db_food = db.query(FoodDatabaseModel).filter(
        FoodDatabaseModel.id == food_id,
        FoodDatabaseModel.user_id == CURRENT_USER_ID
    ).first()

    if not db_food:
        raise HTTPException(status_code=404, detail="Food not found")

    db_food.is_favorite = not db_food.is_favorite
    db_food.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_food)

    return {
        "success": True,
        "is_favorite": db_food.is_favorite,
        "message": f"Food {'added to' if db_food.is_favorite else 'removed from'} favorites"
    }
