import logging
from datetime import date, datetime, time
from typing import List
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal

logger = logging.getLogger(__name__)


def create_scheduled_medication_entries(target_date: date = None):
    """
    Create medication entries from active schedules for the specified date.
    This runs daily at 00:30 alongside Garmin sync.

    Args:
        target_date: Date to create entries for (defaults to today)
    """
    if target_date is None:
        target_date = date.today()

    logger.info(f"Creating scheduled medication entries for {target_date}")

    db = SessionLocal()
    try:
        # Get all active schedules
        schedules = db.query(models.MedicationSchedule).filter(
            models.MedicationSchedule.is_active == True,
            models.MedicationSchedule.start_date <= target_date,
            (models.MedicationSchedule.end_date.is_(None) |
             (models.MedicationSchedule.end_date >= target_date))
        ).all()

        logger.info(f"Found {len(schedules)} active medication schedules")

        entries_created = 0
        for schedule in schedules:
            # Check if schedule_times is valid
            if not schedule.schedule_times or not isinstance(schedule.schedule_times, list):
                logger.warning(f"Schedule {schedule.id} has invalid schedule_times: {schedule.schedule_times}")
                continue

            # Create an entry for each scheduled time
            for time_str in schedule.schedule_times:
                try:
                    # Parse time string (e.g., "08:00")
                    hour, minute = map(int, time_str.split(":"))
                    medication_time = datetime.combine(target_date, time(hour, minute))

                    # Check if entry already exists for this schedule, date, and time
                    existing = db.query(models.Medication).filter(
                        models.Medication.user_id == schedule.user_id,
                        models.Medication.date == target_date,
                        models.Medication.time == medication_time,
                        models.Medication.medication_name == schedule.medication_name,
                        models.Medication.dosage == schedule.dosage
                    ).first()

                    if existing:
                        logger.debug(f"Entry already exists for {schedule.medication_name} at {time_str}")
                        continue

                    # Create new medication entry
                    entry = models.Medication(
                        user_id=schedule.user_id,
                        date=target_date,
                        time=medication_time,
                        medication_name=schedule.medication_name,
                        dosage=schedule.dosage,
                        quantity=schedule.quantity,
                        unit=schedule.unit,
                        notes=f"Auto-created from schedule"
                    )
                    db.add(entry)
                    entries_created += 1
                    logger.info(f"Created medication entry: {schedule.medication_name} at {time_str}")

                except Exception as e:
                    logger.error(f"Failed to create entry for schedule {schedule.id} at time {time_str}: {str(e)}")
                    continue

        db.commit()
        logger.info(f"Successfully created {entries_created} medication entries for {target_date}")
        return entries_created

    except Exception as e:
        logger.error(f"Error creating scheduled medication entries: {str(e)}", exc_info=True)
        db.rollback()
        return 0
    finally:
        db.close()
