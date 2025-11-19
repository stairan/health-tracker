from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import date, timedelta
import logging

from app.database import get_db_session
from app.models import User
from app.services.garmin_service import sync_garmin_data
from app.services.medication_scheduler import create_scheduled_medication_entries
from app.config import settings

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = AsyncIOScheduler()


def sync_all_users_garmin_data():
    """
    Sync Garmin data for all users with configured credentials.
    This function is called by the scheduler.
    """
    logger.info("Starting scheduled Garmin sync for all users...")

    db = get_db_session()
    try:
        # Get all users with Garmin credentials configured
        users = db.query(User).filter(
            User.garmin_username.isnot(None),
            User.garmin_password_encrypted.isnot(None)
        ).all()

        if not users:
            logger.warning("No users with Garmin credentials configured")
            return

        # Sync yesterday's data (today's data might not be complete yet)
        sync_date = date.today() - timedelta(days=1)

        for user in users:
            try:
                logger.info(f"Syncing Garmin data for user {user.id} ({user.username})")
                result = sync_garmin_data(db, user, sync_date, force=False)

                if result["success"]:
                    logger.info(f"Successfully synced data for user {user.id}")
                else:
                    logger.error(f"Failed to sync data for user {user.id}: {result['message']}")

            except Exception as e:
                logger.error(f"Error syncing data for user {user.id}: {str(e)}")

    except Exception as e:
        logger.error(f"Error in scheduled Garmin sync: {str(e)}")
    finally:
        db.close()

    logger.info("Scheduled Garmin sync completed")


def start_scheduler():
    """
    Start the scheduler with configured jobs.
    Call this when the application starts.
    """
    if not settings.garmin_sync_enabled:
        logger.info("Garmin sync scheduler is disabled")
        return

    # Parse sync time (format: "HH:MM")
    try:
        hour, minute = map(int, settings.garmin_sync_time.split(':'))
    except ValueError:
        logger.error(f"Invalid garmin_sync_time format: {settings.garmin_sync_time}")
        hour, minute = 0, 30  # Default to 00:30

    # Add daily Garmin sync job
    scheduler.add_job(
        sync_all_users_garmin_data,
        trigger=CronTrigger(hour=hour, minute=minute),
        id='garmin_sync',
        name='Daily Garmin Data Sync',
        replace_existing=True
    )

    # Add daily medication scheduling job (runs at same time as Garmin sync)
    scheduler.add_job(
        create_scheduled_medication_entries,
        trigger=CronTrigger(hour=hour, minute=minute),
        id='medication_scheduling',
        name='Daily Medication Scheduling',
        replace_existing=True
    )

    scheduler.start()
    logger.info(f"Scheduler started. Garmin sync and medication scheduling at {hour:02d}:{minute:02d}")


def stop_scheduler():
    """
    Stop the scheduler.
    Call this when the application shuts down.
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")


def trigger_manual_sync():
    """
    Manually trigger a sync job (useful for testing or manual syncs).
    """
    logger.info("Manually triggering Garmin sync...")
    sync_all_users_garmin_data()
