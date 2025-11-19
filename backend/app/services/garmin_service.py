from garminconnect import Garmin
from datetime import datetime, date, timedelta
from sqlalchemy.orm import Session
from typing import Optional, Dict, List
import logging

from app.models import GarminData, Activity, GarminSyncLog, User
from app.utils.encryption import decrypt_password

logger = logging.getLogger(__name__)


class GarminService:
    """Service for interacting with Garmin Connect API"""

    def __init__(self, username: str, password: str):
        """
        Initialize Garmin service with credentials.

        Args:
            username: Garmin Connect username/email
            password: Garmin Connect password
        """
        self.username = username
        self.password = password
        self.client: Optional[Garmin] = None

    def login(self) -> bool:
        """
        Authenticate with Garmin Connect.

        Returns:
            bool: True if login successful, False otherwise
        """
        try:
            self.client = Garmin(self.username, self.password)
            self.client.login()
            logger.info(f"Successfully logged in to Garmin Connect as {self.username}")
            return True
        except Exception as e:
            logger.error(f"Failed to login to Garmin Connect: {str(e)}")
            return False

    def get_daily_summary(self, sync_date: date) -> Optional[Dict]:
        """
        Get daily summary data from Garmin.

        Args:
            sync_date: Date to sync data for

        Returns:
            Dict with daily summary data or None if error
        """
        if not self.client:
            logger.error("Garmin client not initialized. Call login() first.")
            return None

        try:
            date_str = sync_date.strftime('%Y-%m-%d')
            summary = self.client.get_stats(date_str)
            return summary
        except Exception as e:
            logger.error(f"Failed to get daily summary for {sync_date}: {str(e)}")
            return None

    def get_heart_rate_data(self, sync_date: date) -> Optional[Dict]:
        """Get heart rate data for a specific date."""
        if not self.client:
            return None

        try:
            date_str = sync_date.strftime('%Y-%m-%d')
            hr_data = self.client.get_heart_rates(date_str)
            return hr_data
        except Exception as e:
            logger.error(f"Failed to get heart rate data for {sync_date}: {str(e)}")
            return None

    def get_sleep_data(self, sync_date: date) -> Optional[Dict]:
        """Get sleep data for a specific date."""
        if not self.client:
            return None

        try:
            date_str = sync_date.strftime('%Y-%m-%d')
            sleep_data = self.client.get_sleep_data(date_str)
            return sleep_data
        except Exception as e:
            logger.error(f"Failed to get sleep data for {sync_date}: {str(e)}")
            return None

    def get_stress_data(self, sync_date: date) -> Optional[Dict]:
        """Get stress data for a specific date."""
        if not self.client:
            return None

        try:
            date_str = sync_date.strftime('%Y-%m-%d')
            stress_data = self.client.get_stress_data(date_str)
            return stress_data
        except Exception as e:
            logger.error(f"Failed to get stress data for {sync_date}: {str(e)}")
            return None

    def get_body_battery(self, sync_date: date) -> Optional[Dict]:
        """Get body battery data for a specific date."""
        if not self.client:
            return None

        try:
            date_str = sync_date.strftime('%Y-%m-%d')
            bb_data = self.client.get_body_battery(date_str)
            return bb_data
        except Exception as e:
            logger.error(f"Failed to get body battery data for {sync_date}: {str(e)}")
            return None

    def get_activities(self, start_date: date, end_date: date) -> Optional[List[Dict]]:
        """Get activities/workouts for a date range."""
        if not self.client:
            return None

        try:
            activities = self.client.get_activities_by_date(
                start_date.strftime('%Y-%m-%d'),
                end_date.strftime('%Y-%m-%d')
            )
            return activities
        except Exception as e:
            logger.error(f"Failed to get activities: {str(e)}")
            return None

    def get_weight_data(self, sync_date: date) -> Optional[Dict]:
        """Get weight and body composition data."""
        if not self.client:
            return None

        try:
            date_str = sync_date.strftime('%Y-%m-%d')
            # get_weigh_ins requires both start and end date
            weight_data = self.client.get_weigh_ins(date_str, date_str)
            return weight_data
        except Exception as e:
            logger.error(f"Failed to get weight data for {sync_date}: {str(e)}")
            return None


def sync_garmin_data(db: Session, user: User, sync_date: Optional[date] = None, force: bool = False) -> Dict:
    """
    Synchronize Garmin data for a specific date.

    Args:
        db: Database session
        user: User object with Garmin credentials
        sync_date: Date to sync (default: yesterday)
        force: Force resync even if data exists

    Returns:
        Dict with sync results
    """
    if not sync_date:
        # Sync yesterday's data by default (today's data might not be complete)
        sync_date = date.today() - timedelta(days=1)

    # Check if we already have data for this date
    if not force:
        existing = db.query(GarminData).filter(
            GarminData.user_id == user.id,
            GarminData.date == sync_date
        ).first()
        if existing:
            logger.info(f"Data for {sync_date} already exists. Use force=True to resync.")
            return {
                "success": True,
                "message": "Data already exists",
                "date": sync_date,
                "data_types_synced": []
            }

    # Decrypt Garmin credentials
    if not user.garmin_username or not user.garmin_password_encrypted:
        return {
            "success": False,
            "message": "Garmin credentials not configured",
            "date": sync_date,
            "data_types_synced": [],
            "errors": {"auth": "Missing Garmin credentials"}
        }

    try:
        garmin_password = decrypt_password(user.garmin_password_encrypted)
    except Exception as e:
        logger.error(f"Failed to decrypt Garmin password: {str(e)}")
        return {
            "success": False,
            "message": "Failed to decrypt credentials",
            "date": sync_date,
            "data_types_synced": [],
            "errors": {"auth": str(e)}
        }

    # Initialize Garmin service
    garmin_service = GarminService(user.garmin_username, garmin_password)

    if not garmin_service.login():
        _log_sync_attempt(db, user.id, sync_date, False, "Failed to login to Garmin Connect", [])
        return {
            "success": False,
            "message": "Failed to login to Garmin Connect",
            "date": sync_date,
            "data_types_synced": [],
            "errors": {"auth": "Login failed"}
        }

    # Sync different data types
    synced_data_types = []
    errors = {}
    raw_data = {}

    # Get daily summary (steps, calories, etc.)
    daily_summary = garmin_service.get_daily_summary(sync_date)
    if daily_summary:
        raw_data['daily_summary'] = daily_summary
        synced_data_types.append('daily_summary')

    # Get heart rate data
    hr_data = garmin_service.get_heart_rate_data(sync_date)
    if hr_data:
        raw_data['heart_rate'] = hr_data
        synced_data_types.append('heart_rate')

    # Get sleep data
    sleep_data = garmin_service.get_sleep_data(sync_date)
    if sleep_data:
        raw_data['sleep'] = sleep_data
        synced_data_types.append('sleep')

    # Get stress data
    stress_data = garmin_service.get_stress_data(sync_date)
    if stress_data:
        raw_data['stress'] = stress_data
        synced_data_types.append('stress')

    # Get body battery
    body_battery = garmin_service.get_body_battery(sync_date)
    if body_battery:
        raw_data['body_battery'] = body_battery
        synced_data_types.append('body_battery')

    # Get weight data
    weight_data = garmin_service.get_weight_data(sync_date)
    if weight_data:
        raw_data['weight'] = weight_data
        synced_data_types.append('weight')

    # Get activities for the day
    activities = garmin_service.get_activities(sync_date, sync_date)
    if activities:
        raw_data['activities'] = activities
        synced_data_types.append('activities')
        _save_activities(db, user.id, activities, sync_date)

    # Create or update GarminData record
    if synced_data_types:
        garmin_data = _create_garmin_data_record(db, user.id, sync_date, raw_data, force)
        if garmin_data:
            _log_sync_attempt(db, user.id, sync_date, True, "Sync successful", synced_data_types)
            return {
                "success": True,
                "message": "Data synced successfully",
                "date": sync_date,
                "data_types_synced": synced_data_types,
                "errors": errors if errors else None
            }

    _log_sync_attempt(db, user.id, sync_date, False, "No data retrieved", synced_data_types)
    return {
        "success": False,
        "message": "Failed to retrieve data from Garmin",
        "date": sync_date,
        "data_types_synced": synced_data_types,
        "errors": errors if errors else None
    }


def _create_garmin_data_record(
    db: Session,
    user_id: int,
    sync_date: date,
    raw_data: Dict,
    force: bool = False
) -> Optional[GarminData]:
    """Create or update GarminData record from raw Garmin data."""
    try:
        logger.info(f"Creating GarminData record for user {user_id}, date {sync_date}")
        logger.info(f"Raw data keys: {list(raw_data.keys())}")

        # Check if record exists
        garmin_data = db.query(GarminData).filter(
            GarminData.user_id == user_id,
            GarminData.date == sync_date
        ).first()

        if not garmin_data:
            logger.info(f"Creating new GarminData record")
            garmin_data = GarminData(user_id=user_id, date=sync_date)
            db.add(garmin_data)
        else:
            logger.info(f"Updating existing GarminData record")

        # Extract and map data from raw_data
        # Note: Most data comes from daily_summary in the Garmin API
        try:
            if 'daily_summary' in raw_data:
                logger.info("Processing daily_summary data")
                summary = raw_data['daily_summary']
                logger.debug(f"Daily summary type: {type(summary)}")
                if isinstance(summary, dict):
                    # Activity metrics
                    garmin_data.steps = summary.get('totalSteps')
                    garmin_data.distance_meters = summary.get('totalDistanceMeters')
                    garmin_data.calories_active = summary.get('activeKilocalories')
                    garmin_data.calories_total = summary.get('totalKilocalories')
                    garmin_data.floors_climbed = summary.get('floorsAscended')
                    garmin_data.moderate_intensity_minutes = summary.get('moderateIntensityMinutes')
                    garmin_data.vigorous_intensity_minutes = summary.get('vigorousIntensityMinutes')

                    # Heart rate (from daily summary)
                    garmin_data.min_heart_rate = summary.get('minHeartRate')
                    garmin_data.max_heart_rate = summary.get('maxHeartRate')
                    garmin_data.resting_heart_rate = summary.get('restingHeartRate')
                    garmin_data.avg_heart_rate = summary.get('minAvgHeartRate')  # or 'maxAvgHeartRate'

                    # Stress (from daily summary)
                    garmin_data.avg_stress_level = summary.get('averageStressLevel')
                    garmin_data.max_stress_level = summary.get('maxStressLevel')

                    # Sleep duration (from daily summary)
                    garmin_data.sleep_duration_seconds = summary.get('sleepingSeconds') or summary.get('measurableAsleepDuration')

                    logger.info(f"Extracted daily summary: steps={garmin_data.steps}, calories={garmin_data.calories_total}, HR={garmin_data.resting_heart_rate}, stress={garmin_data.avg_stress_level}")
        except Exception as e:
            logger.error(f"Error processing daily_summary: {str(e)}", exc_info=True)

        try:
            # Heart rate data from separate API (if available, overrides daily_summary)
            if 'heart_rate' in raw_data:
                logger.info("Processing heart_rate data (separate API)")
                hr = raw_data['heart_rate']
                logger.debug(f"Heart rate type: {type(hr)}")
                if isinstance(hr, dict):
                    # Only override if values are present
                    if hr.get('restingHeartRate'):
                        garmin_data.resting_heart_rate = hr.get('restingHeartRate')
                    if hr.get('maxHeartRate'):
                        garmin_data.max_heart_rate = hr.get('maxHeartRate')
                    if hr.get('averageHeartRate'):
                        garmin_data.avg_heart_rate = hr.get('averageHeartRate')
                    logger.info(f"Extracted additional heart rate data: resting={garmin_data.resting_heart_rate}")
        except Exception as e:
            logger.error(f"Error processing heart_rate: {str(e)}", exc_info=True)

        try:
            if 'sleep' in raw_data:
                logger.info("Processing sleep data")
                sleep = raw_data['sleep']

                if isinstance(sleep, dict):
                    # Sleep data is nested in dailySleepDTO
                    daily_sleep = sleep.get('dailySleepDTO')
                    if isinstance(daily_sleep, dict):
                        logger.info("Found dailySleepDTO")

                        # Sleep timing from dailySleepDTO
                        sleep_start = daily_sleep.get('sleepStartTimestampGMT')
                        sleep_end = daily_sleep.get('sleepEndTimestampGMT')
                        if sleep_start:
                            try:
                                garmin_data.sleep_start_time = datetime.fromtimestamp(sleep_start / 1000)
                            except Exception as e:
                                logger.warning(f"Failed to parse sleep start time: {e}")
                        if sleep_end:
                            try:
                                garmin_data.sleep_end_time = datetime.fromtimestamp(sleep_end / 1000)
                            except Exception as e:
                                logger.warning(f"Failed to parse sleep end time: {e}")

                        # Sleep duration from dailySleepDTO
                        garmin_data.sleep_duration_seconds = daily_sleep.get('sleepTimeSeconds')

                        # Sleep stages from dailySleepDTO (not sleepLevels!)
                        garmin_data.deep_sleep_seconds = daily_sleep.get('deepSleepSeconds')
                        garmin_data.light_sleep_seconds = daily_sleep.get('lightSleepSeconds')
                        garmin_data.rem_sleep_seconds = daily_sleep.get('remSleepSeconds')
                        garmin_data.awake_seconds = daily_sleep.get('awakeSleepSeconds')

                        # Sleep score from dailySleepDTO
                        sleep_scores = daily_sleep.get('sleepScores')
                        if isinstance(sleep_scores, dict):
                            overall = sleep_scores.get('overall')
                            if isinstance(overall, dict):
                                garmin_data.sleep_score = overall.get('value')

                        logger.info(f"Extracted from dailySleepDTO: start={garmin_data.sleep_start_time}, duration={garmin_data.sleep_duration_seconds}s, deep={garmin_data.deep_sleep_seconds}s, light={garmin_data.light_sleep_seconds}s, rem={garmin_data.rem_sleep_seconds}s")

                    logger.info(f"Final sleep: start={garmin_data.sleep_start_time}, duration={garmin_data.sleep_duration_seconds}s, score={garmin_data.sleep_score}")
        except Exception as e:
            logger.error(f"Error processing sleep: {str(e)}", exc_info=True)

        try:
            # Stress data from separate API (if available, overrides daily_summary)
            if 'stress' in raw_data:
                logger.info("Processing stress data (separate API)")
                stress = raw_data['stress']
                logger.debug(f"Stress type: {type(stress)}")
                if isinstance(stress, dict):
                    # Only override if values are present
                    if stress.get('averageStressLevel'):
                        garmin_data.avg_stress_level = stress.get('averageStressLevel')
                    if stress.get('maxStressLevel'):
                        garmin_data.max_stress_level = stress.get('maxStressLevel')
                    logger.info(f"Extracted additional stress data: avg={garmin_data.avg_stress_level}")
        except Exception as e:
            logger.error(f"Error processing stress: {str(e)}", exc_info=True)

        try:
            if 'body_battery' in raw_data:
                logger.info("Processing body_battery data")
                bb = raw_data['body_battery']

                # Body battery is a list, get first element
                if isinstance(bb, list) and len(bb) > 0:
                    bb_data = bb[0]
                    logger.info(f"Found body battery data (list with {len(bb)} elements)")

                    garmin_data.body_battery_charged = bb_data.get('charged')
                    garmin_data.body_battery_drained = bb_data.get('drained')

                    # Find highest and lowest from bodyBatteryValuesArray
                    bb_values = bb_data.get('bodyBatteryValuesArray', [])
                    if bb_values:
                        # Each element is [timestamp, value]
                        values_only = [v[1] for v in bb_values if len(v) > 1]
                        if values_only:
                            garmin_data.body_battery_highest = max(values_only)
                            garmin_data.body_battery_lowest = min(values_only)

                    logger.info(f"Extracted body battery: charged={garmin_data.body_battery_charged}, drained={garmin_data.body_battery_drained}, highest={garmin_data.body_battery_highest}, lowest={garmin_data.body_battery_lowest}")
        except Exception as e:
            logger.error(f"Error processing body_battery: {str(e)}", exc_info=True)

        try:
            if 'weight' in raw_data:
                logger.info("Processing weight data")
                weight = raw_data['weight']
                logger.debug(f"Weight type: {type(weight)}, length: {len(weight) if isinstance(weight, list) else 'N/A'}")
                if weight and isinstance(weight, list) and len(weight) > 0:
                    latest = weight[0]
                    logger.debug(f"Latest weight entry type: {type(latest)}")
                    if isinstance(latest, dict):
                        garmin_data.weight_kg = latest.get('weight') / 1000 if latest.get('weight') else None
                        garmin_data.bmi = latest.get('bmi')
                        garmin_data.body_fat_percentage = latest.get('bodyFat')
                        logger.info(f"Extracted weight: {garmin_data.weight_kg}kg, BMI={garmin_data.bmi}")
        except Exception as e:
            logger.error(f"Error processing weight: {str(e)}", exc_info=True)

        # Store raw data
        logger.info("Storing raw data and committing to database")
        garmin_data.raw_data = raw_data
        garmin_data.synced_at = datetime.utcnow()

        db.commit()
        db.refresh(garmin_data)
        logger.info(f"Successfully saved GarminData record with ID {garmin_data.id}")
        return garmin_data

    except Exception as e:
        logger.error(f"Failed to create GarminData record: {str(e)}", exc_info=True)
        db.rollback()
        return None


def _save_activities(db: Session, user_id: int, activities: List[Dict], sync_date: date):
    """Save activities to database."""
    try:
        for activity_data in activities:
            activity_id = str(activity_data.get('activityId'))

            # Check if activity already exists
            existing = db.query(Activity).filter(
                Activity.garmin_activity_id == activity_id
            ).first()

            if not existing:
                activity = Activity(
                    user_id=user_id,
                    garmin_activity_id=activity_id,
                    date=sync_date,
                    start_time=datetime.fromisoformat(activity_data.get('startTimeLocal').replace('Z', '+00:00')) if activity_data.get('startTimeLocal') else None,
                    duration_seconds=activity_data.get('duration'),
                    activity_type=activity_data.get('activityType', {}).get('typeKey'),
                    activity_name=activity_data.get('activityName'),
                    distance_meters=activity_data.get('distance'),
                    calories=activity_data.get('calories'),
                    avg_heart_rate=activity_data.get('averageHR'),
                    max_heart_rate=activity_data.get('maxHR'),
                    avg_speed=activity_data.get('averageSpeed'),
                    max_speed=activity_data.get('maxSpeed'),
                    elevation_gain=activity_data.get('elevationGain'),
                    raw_data=activity_data,
                    synced_at=datetime.utcnow()
                )
                db.add(activity)

        db.commit()
    except Exception as e:
        logger.error(f"Failed to save activities: {str(e)}")
        db.rollback()


def _log_sync_attempt(
    db: Session,
    user_id: int,
    sync_date: date,
    success: bool,
    message: str,
    data_types: List[str]
):
    """Log a Garmin sync attempt."""
    try:
        log_entry = GarminSyncLog(
            user_id=user_id,
            sync_date=sync_date,
            success=success,
            error_message=message if not success else None,
            data_types_synced=data_types
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log sync attempt: {str(e)}")
        db.rollback()
