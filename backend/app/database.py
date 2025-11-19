from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from typing import Generator
import os
from pathlib import Path

# Get the database path from environment or use default
DATABASE_DIR = os.getenv("DATABASE_DIR", "./data")
DATABASE_PATH = os.path.join(DATABASE_DIR, "health_tracker.db")

# Ensure the data directory exists
Path(DATABASE_DIR).mkdir(parents=True, exist_ok=True)

# Create SQLite database URL
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

# Create engine
# connect_args={"check_same_thread": False} is needed for SQLite
# StaticPool is used for testing, but we'll use the default pool for production
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False  # Set to True for SQL query logging
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session.
    Use this in FastAPI route dependencies.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize the database by creating all tables.
    Call this on application startup.
    """
    from app.models import Base
    Base.metadata.create_all(bind=engine)
    print(f"Database initialized at: {DATABASE_PATH}")


def get_db_session() -> Session:
    """
    Get a database session for use outside of FastAPI routes.
    Remember to close the session when done.
    """
    return SessionLocal()
