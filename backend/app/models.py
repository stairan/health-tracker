from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Text, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class User(Base):
    """User model for authentication and settings"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True)
    garmin_username = Column(String)
    garmin_password_encrypted = Column(String)  # Encrypted Garmin credentials
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class GarminData(Base):
    """Daily Garmin metrics synchronized from Garmin Connect"""
    __tablename__ = "garmin_data"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)

    # Activity metrics
    steps = Column(Integer)
    distance_meters = Column(Float)
    calories_active = Column(Integer)
    calories_total = Column(Integer)
    floors_climbed = Column(Float)

    # Heart rate
    min_heart_rate = Column(Integer)
    resting_heart_rate = Column(Integer)
    max_heart_rate = Column(Integer)
    avg_heart_rate = Column(Integer)

    # Sleep data
    sleep_start_time = Column(DateTime)  # When sleep started (can be previous day)
    sleep_end_time = Column(DateTime)    # When woke up (can be next day)
    sleep_duration_seconds = Column(Integer)
    deep_sleep_seconds = Column(Integer)
    light_sleep_seconds = Column(Integer)
    rem_sleep_seconds = Column(Integer)
    awake_seconds = Column(Integer)
    sleep_score = Column(Integer)

    # Stress and body battery
    avg_stress_level = Column(Integer)
    max_stress_level = Column(Integer)
    body_battery_charged = Column(Integer)
    body_battery_drained = Column(Integer)
    body_battery_highest = Column(Integer)
    body_battery_lowest = Column(Integer)

    # Weight and body composition
    weight_kg = Column(Float)
    bmi = Column(Float)
    body_fat_percentage = Column(Float)

    # Intensity minutes
    moderate_intensity_minutes = Column(Integer)
    vigorous_intensity_minutes = Column(Integer)

    # Raw JSON data for future reference
    raw_data = Column(JSON)

    synced_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")


class Activity(Base):
    """Individual workout/activity sessions from Garmin"""
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    garmin_activity_id = Column(String, unique=True)

    date = Column(Date, nullable=False, index=True)
    start_time = Column(DateTime)
    duration_seconds = Column(Integer)

    activity_type = Column(String)  # running, cycling, swimming, etc.
    activity_name = Column(String)

    distance_meters = Column(Float)
    calories = Column(Integer)
    avg_heart_rate = Column(Integer)
    max_heart_rate = Column(Integer)
    avg_speed = Column(Float)
    max_speed = Column(Float)
    elevation_gain = Column(Float)

    raw_data = Column(JSON)
    synced_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")


class FoodDatabase(Base):
    """Library of foods with nutritional info for quick logging"""
    __tablename__ = "food_database"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    name = Column(String, nullable=False, index=True)  # "Chicken breast, grilled"

    # Serving size
    serving_size = Column(String)  # "100g" or "1 piece"

    # Nutritional info (per serving)
    calories = Column(Integer)
    protein_grams = Column(Float)
    carbs_grams = Column(Float)
    fat_grams = Column(Float)

    # For drinks
    is_drink = Column(Boolean, default=False)
    volume_ml = Column(Integer)

    # Usage tracking
    times_logged = Column(Integer, default=0)
    last_used = Column(DateTime)
    is_favorite = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")


class FoodEntry(Base):
    """Food and drink entries"""
    __tablename__ = "food_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    food_database_id = Column(Integer, ForeignKey("food_database.id"), nullable=True)
    date = Column(Date, nullable=False, index=True)
    time = Column(DateTime, nullable=False)

    meal_type = Column(String)  # breakfast, lunch, dinner, snack
    description = Column(Text, nullable=False)

    # Optional nutritional info
    calories = Column(Integer)
    protein_grams = Column(Float)
    carbs_grams = Column(Float)
    fat_grams = Column(Float)

    # For drinks
    is_drink = Column(Boolean, default=False)
    volume_ml = Column(Integer)

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    food_database = relationship("FoodDatabase")


class Medication(Base):
    """Medication tracking"""
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    time = Column(DateTime, nullable=False)

    medication_name = Column(String, nullable=False)
    dosage = Column(String)
    quantity = Column(Float)  # Number of pills/doses
    unit = Column(String)  # mg, ml, pills, etc.

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")


class MedicationSchedule(Base):
    """Scheduled/regular medications that auto-create daily entries"""
    __tablename__ = "medication_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    medication_name = Column(String, nullable=False)
    dosage = Column(String)
    quantity = Column(Float)  # Number of pills/doses
    unit = Column(String)  # mg, ml, pills, etc.

    # Schedule times (time of day to take medication)
    schedule_times = Column(JSON)  # List of times like ["08:00", "20:00"]

    # Active period
    is_active = Column(Boolean, default=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)  # Optional - if None, ongoing

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")


class Sickness(Base):
    """Illness and symptom tracking"""
    __tablename__ = "sickness_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)

    # Symptom details
    symptoms = Column(Text, nullable=False)  # Comma-separated or description
    severity = Column(String)  # mild, moderate, severe

    # Fever tracking
    has_fever = Column(Boolean, default=False)
    temperature_celsius = Column(Float)
    temperature_time = Column(DateTime)

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")


class Seizure(Base):
    """Epileptic seizure tracking"""
    __tablename__ = "seizures"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    time = Column(DateTime, nullable=False)

    # Seizure details
    seizure_type = Column(String)  # focal, generalized, absence, tonic-clonic, etc.
    duration_seconds = Column(Integer)
    severity = Column(String)  # mild, moderate, severe

    # Context
    triggers = Column(Text)  # Potential triggers
    warning_signs = Column(Text)  # Aura or warning signs
    post_seizure_state = Column(Text)  # How you felt after

    # Location and circumstances
    location = Column(String)
    activity_before = Column(Text)

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")


class DailyNote(Base):
    """Daily journal/notes"""
    __tablename__ = "daily_notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, unique=True, index=True)

    mood = Column(String)  # happy, sad, anxious, neutral, etc.
    energy_level = Column(Integer)  # 1-10 scale

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")


class WaterIntake(Base):
    """Water/hydration tracking"""
    __tablename__ = "water_intake"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    time = Column(DateTime, nullable=False)

    amount_ml = Column(Integer, nullable=False)
    notes = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")


class GarminSyncLog(Base):
    """Log of Garmin synchronization attempts"""
    __tablename__ = "garmin_sync_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sync_date = Column(Date, nullable=False)
    sync_timestamp = Column(DateTime, default=datetime.utcnow)

    success = Column(Boolean, default=False)
    error_message = Column(Text)
    data_types_synced = Column(JSON)  # List of data types successfully synced

    # Relationships
    user = relationship("User")


class HealthEvent(Base):
    """Health events like surgeries, hospitalizations, vaccinations, doctor visits, etc."""
    __tablename__ = "health_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    time = Column(DateTime)  # Optional - some events have specific times

    # Event details
    event_type = Column(String, nullable=False)  # surgery, hospitalization, doctor_visit, vaccination, diagnosis, procedure, test_result, other
    title = Column(String, nullable=False)  # Short description
    description = Column(Text)  # Detailed description

    # Location and provider
    location = Column(String)  # Hospital/clinic name
    provider = Column(String)  # Doctor/provider name

    # Follow-up and outcome
    follow_up_date = Column(Date)  # Scheduled follow-up date
    outcome = Column(String)  # Result/outcome of the event

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
