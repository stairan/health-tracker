from pydantic import BaseModel, Field, ConfigDict
import datetime as dt
from datetime import datetime, date
from typing import Optional, List, Dict, Any


# User Schemas
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None


class UserCreate(UserBase):
    garmin_username: Optional[str] = None
    garmin_password: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[str] = None
    garmin_username: Optional[str] = None
    garmin_password: Optional[str] = None


class User(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Garmin Data Schemas
class GarminDataBase(BaseModel):
    date: date
    steps: Optional[int] = None
    distance_meters: Optional[float] = None
    calories_active: Optional[int] = None
    calories_total: Optional[int] = None
    floors_climbed: Optional[float] = None
    min_heart_rate: Optional[int] = None
    resting_heart_rate: Optional[int] = None
    max_heart_rate: Optional[int] = None
    avg_heart_rate: Optional[int] = None
    sleep_start_time: Optional[datetime] = None
    sleep_end_time: Optional[datetime] = None
    sleep_duration_seconds: Optional[int] = None
    deep_sleep_seconds: Optional[int] = None
    light_sleep_seconds: Optional[int] = None
    rem_sleep_seconds: Optional[int] = None
    awake_seconds: Optional[int] = None
    sleep_score: Optional[int] = None
    avg_stress_level: Optional[int] = None
    max_stress_level: Optional[int] = None
    body_battery_charged: Optional[int] = None
    body_battery_drained: Optional[int] = None
    body_battery_highest: Optional[int] = None
    body_battery_lowest: Optional[int] = None
    weight_kg: Optional[float] = None
    bmi: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    moderate_intensity_minutes: Optional[int] = None
    vigorous_intensity_minutes: Optional[int] = None


class GarminData(GarminDataBase):
    id: int
    user_id: int
    synced_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Activity Schemas
class ActivityBase(BaseModel):
    date: date
    start_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    activity_type: Optional[str] = None
    activity_name: Optional[str] = None
    distance_meters: Optional[float] = None
    calories: Optional[int] = None
    avg_heart_rate: Optional[int] = None
    max_heart_rate: Optional[int] = None
    avg_speed: Optional[float] = None
    max_speed: Optional[float] = None
    elevation_gain: Optional[float] = None


class Activity(ActivityBase):
    id: int
    user_id: int
    garmin_activity_id: Optional[str] = None
    synced_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Food Database Schemas
class FoodDatabaseBase(BaseModel):
    name: str
    serving_size: Optional[str] = None
    calories: Optional[int] = None
    protein_grams: Optional[float] = None
    carbs_grams: Optional[float] = None
    fat_grams: Optional[float] = None
    is_drink: bool = False
    volume_ml: Optional[int] = None


class FoodDatabaseCreate(FoodDatabaseBase):
    pass


class FoodDatabaseUpdate(BaseModel):
    name: Optional[str] = None
    serving_size: Optional[str] = None
    calories: Optional[int] = None
    protein_grams: Optional[float] = None
    carbs_grams: Optional[float] = None
    fat_grams: Optional[float] = None
    is_drink: Optional[bool] = None
    volume_ml: Optional[int] = None
    is_favorite: Optional[bool] = None


class FoodDatabase(FoodDatabaseBase):
    id: int
    user_id: int
    times_logged: int
    last_used: Optional[datetime] = None
    is_favorite: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Food Entry Schemas
class FoodEntryBase(BaseModel):
    date: date
    time: datetime
    meal_type: str = Field(..., description="breakfast, lunch, dinner, snack, or other")
    description: str
    calories: Optional[int] = None
    protein_grams: Optional[float] = None
    carbs_grams: Optional[float] = None
    fat_grams: Optional[float] = None
    is_drink: bool = False
    volume_ml: Optional[int] = None
    notes: Optional[str] = None


class FoodEntryCreate(FoodEntryBase):
    food_database_id: Optional[int] = None
    save_to_database: bool = True


class FoodEntryUpdate(BaseModel):
    time: Optional[datetime] = None
    meal_type: Optional[str] = None
    description: Optional[str] = None
    calories: Optional[int] = None
    protein_grams: Optional[float] = None
    carbs_grams: Optional[float] = None
    fat_grams: Optional[float] = None
    is_drink: Optional[bool] = None
    volume_ml: Optional[int] = None
    notes: Optional[str] = None


class FoodEntry(FoodEntryBase):
    id: int
    user_id: int
    food_database_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Medication Schemas
class MedicationBase(BaseModel):
    date: date
    time: datetime
    medication_name: str
    dosage: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class MedicationCreate(MedicationBase):
    pass


class MedicationUpdate(BaseModel):
    date: Optional[dt.date] = None
    time: Optional[datetime] = None
    medication_name: Optional[str] = None
    dosage: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


class Medication(MedicationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Medication Schedule Schemas
class MedicationScheduleBase(BaseModel):
    medication_name: str
    dosage: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    schedule_times: List[str]  # e.g., ["08:00", "20:00"]
    is_active: bool = True
    start_date: date
    end_date: Optional[date] = None
    notes: Optional[str] = None


class MedicationScheduleCreate(MedicationScheduleBase):
    pass


class MedicationScheduleUpdate(BaseModel):
    medication_name: Optional[str] = None
    dosage: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    schedule_times: Optional[List[str]] = None
    is_active: Optional[bool] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None


class MedicationSchedule(MedicationScheduleBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Sickness Schemas
class SicknessBase(BaseModel):
    date: date
    symptoms: str
    severity: Optional[str] = Field(None, description="mild, moderate, or severe")
    has_fever: bool = False
    temperature_celsius: Optional[float] = None
    temperature_time: Optional[datetime] = None
    notes: Optional[str] = None


class SicknessCreate(SicknessBase):
    pass


class SicknessUpdate(BaseModel):
    symptoms: Optional[str] = None
    severity: Optional[str] = None
    has_fever: Optional[bool] = None
    temperature_celsius: Optional[float] = None
    temperature_time: Optional[datetime] = None
    notes: Optional[str] = None


class Sickness(SicknessBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Seizure Schemas
class SeizureBase(BaseModel):
    date: date
    time: datetime
    seizure_type: Optional[str] = None
    duration_seconds: Optional[int] = None
    severity: Optional[str] = Field(None, description="mild, moderate, or severe")
    triggers: Optional[str] = None
    warning_signs: Optional[str] = None
    post_seizure_state: Optional[str] = None
    location: Optional[str] = None
    activity_before: Optional[str] = None
    notes: Optional[str] = None


class SeizureCreate(SeizureBase):
    pass


class SeizureUpdate(BaseModel):
    time: Optional[datetime] = None
    seizure_type: Optional[str] = None
    duration_seconds: Optional[int] = None
    severity: Optional[str] = None
    triggers: Optional[str] = None
    warning_signs: Optional[str] = None
    post_seizure_state: Optional[str] = None
    location: Optional[str] = None
    activity_before: Optional[str] = None
    notes: Optional[str] = None


class Seizure(SeizureBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Daily Note Schemas
class DailyNoteBase(BaseModel):
    date: date
    mood: Optional[str] = None
    energy_level: Optional[int] = Field(None, ge=1, le=10)
    notes: Optional[str] = None


class DailyNoteCreate(DailyNoteBase):
    pass


class DailyNoteUpdate(BaseModel):
    mood: Optional[str] = None
    energy_level: Optional[int] = Field(None, ge=1, le=10)
    notes: Optional[str] = None


class DailyNote(DailyNoteBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Water Intake Schemas
class WaterIntakeBase(BaseModel):
    date: date
    time: datetime
    amount_ml: int
    notes: Optional[str] = None


class WaterIntakeCreate(WaterIntakeBase):
    pass


class WaterIntake(WaterIntakeBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Garmin Sync Schemas
class GarminSyncRequest(BaseModel):
    date: Optional[str] = None  # Date string in YYYY-MM-DD format, if None sync yesterday's data
    force: bool = False  # Force resync even if data exists


class GarminSyncResponse(BaseModel):
    success: bool
    message: str
    date: date
    data_types_synced: List[str]
    errors: Optional[Dict[str, str]] = None


# Export Schemas
class ExportRequest(BaseModel):
    start_date: date
    end_date: date
    include_garmin: bool = True
    include_food: bool = True
    include_medications: bool = True
    include_sickness: bool = True
    include_seizures: bool = True
    include_notes: bool = True
    include_water: bool = True
    include_health_events: bool = True
    format: str = Field("json", description="json, csv, or parquet")


class ExportResponse(BaseModel):
    success: bool
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    message: str


# Dashboard/Summary Schemas
class DailySummary(BaseModel):
    date: date
    garmin_data: Optional[GarminData] = None
    activities: List[Activity] = []
    food_entries: List[FoodEntry] = []
    medications: List[Medication] = []
    sickness_entries: List[Sickness] = []
    seizures: List[Seizure] = []
    water_intake: List[WaterIntake] = []
    daily_note: Optional[DailyNote] = None

    # Computed summaries
    total_calories_consumed: Optional[int] = None
    total_water_ml: Optional[int] = None
    medication_count: int = 0


class DateRangeSummary(BaseModel):
    start_date: date
    end_date: date
    total_days: int
    days_with_data: int

    # Aggregated metrics
    avg_steps: Optional[float] = None
    avg_sleep_hours: Optional[float] = None
    total_seizures: int = 0
    total_medications: int = 0
    days_with_sickness: int = 0


# Health Event Schemas
class HealthEventBase(BaseModel):
    date: date
    time: Optional[datetime] = None
    event_type: str = Field(..., description="surgery, hospitalization, doctor_visit, vaccination, diagnosis, procedure, test_result, other")
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    provider: Optional[str] = None
    follow_up_date: Optional[date] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None


class HealthEventCreate(HealthEventBase):
    pass


class HealthEventUpdate(BaseModel):
    date: Optional[date] = None
    time: Optional[datetime] = None
    event_type: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    provider: Optional[str] = None
    follow_up_date: Optional[date] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None


class HealthEvent(HealthEventBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
