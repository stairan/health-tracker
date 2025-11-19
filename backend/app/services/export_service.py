import pandas as pd
import json
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging

from app.models import (
    GarminData, Activity, FoodEntry, Medication,
    Sickness, Seizure, DailyNote, WaterIntake, User
)

logger = logging.getLogger(__name__)


class ExportService:
    """Service for exporting health data in various formats for AI analysis."""

    def __init__(self, db: Session, user_id: int, export_dir: str):
        self.db = db
        self.user_id = user_id
        self.export_dir = Path(export_dir)
        self.export_dir.mkdir(parents=True, exist_ok=True)

    def export_data(
        self,
        start_date: date,
        end_date: date,
        format: str = "json",
        include_garmin: bool = True,
        include_food: bool = True,
        include_medications: bool = True,
        include_sickness: bool = True,
        include_seizures: bool = True,
        include_notes: bool = True,
        include_water: bool = True
    ) -> Dict:
        """
        Export health data for a date range in specified format.

        Args:
            start_date: Start date for export
            end_date: End date for export
            format: Export format (json, csv, parquet)
            include_*: Flags to include specific data types

        Returns:
            Dict with export result info
        """
        try:
            # Collect all data
            data = self._collect_data(
                start_date, end_date,
                include_garmin, include_food, include_medications,
                include_sickness, include_seizures, include_notes, include_water
            )

            # Generate filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"health_data_{start_date}_{end_date}_{timestamp}"

            # Export based on format
            if format.lower() == "json":
                file_path = self._export_json(data, filename)
            elif format.lower() == "csv":
                file_path = self._export_csv(data, filename)
            elif format.lower() == "parquet":
                file_path = self._export_parquet(data, filename)
            else:
                raise ValueError(f"Unsupported export format: {format}")

            return {
                "success": True,
                "file_path": str(file_path),
                "message": f"Data exported successfully to {file_path.name}",
                "format": format,
                "date_range": f"{start_date} to {end_date}"
            }

        except Exception as e:
            logger.error(f"Export failed: {str(e)}")
            return {
                "success": False,
                "message": f"Export failed: {str(e)}"
            }

    def _collect_data(
        self, start_date: date, end_date: date,
        include_garmin: bool, include_food: bool, include_medications: bool,
        include_sickness: bool, include_seizures: bool, include_notes: bool,
        include_water: bool
    ) -> Dict:
        """Collect all requested data from database."""
        data = {
            "metadata": {
                "export_date": datetime.now().isoformat(),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "user_id": self.user_id
            }
        }

        date_filter = and_(
            lambda model: model.date >= start_date,
            lambda model: model.date <= end_date,
            lambda model: model.user_id == self.user_id
        )

        if include_garmin:
            garmin_data = self.db.query(GarminData).filter(
                GarminData.user_id == self.user_id,
                GarminData.date >= start_date,
                GarminData.date <= end_date
            ).all()
            data["garmin_data"] = [self._model_to_dict(g) for g in garmin_data]

            activities = self.db.query(Activity).filter(
                Activity.user_id == self.user_id,
                Activity.date >= start_date,
                Activity.date <= end_date
            ).all()
            data["activities"] = [self._model_to_dict(a) for a in activities]

        if include_food:
            food_entries = self.db.query(FoodEntry).filter(
                FoodEntry.user_id == self.user_id,
                FoodEntry.date >= start_date,
                FoodEntry.date <= end_date
            ).all()
            data["food_entries"] = [self._model_to_dict(f) for f in food_entries]

        if include_medications:
            medications = self.db.query(Medication).filter(
                Medication.user_id == self.user_id,
                Medication.date >= start_date,
                Medication.date <= end_date
            ).all()
            data["medications"] = [self._model_to_dict(m) for m in medications]

        if include_sickness:
            sickness = self.db.query(Sickness).filter(
                Sickness.user_id == self.user_id,
                Sickness.date >= start_date,
                Sickness.date <= end_date
            ).all()
            data["sickness_entries"] = [self._model_to_dict(s) for s in sickness]

        if include_seizures:
            seizures = self.db.query(Seizure).filter(
                Seizure.user_id == self.user_id,
                Seizure.date >= start_date,
                Seizure.date <= end_date
            ).all()
            data["seizures"] = [self._model_to_dict(s) for s in seizures]

        if include_notes:
            notes = self.db.query(DailyNote).filter(
                DailyNote.user_id == self.user_id,
                DailyNote.date >= start_date,
                DailyNote.date <= end_date
            ).all()
            data["daily_notes"] = [self._model_to_dict(n) for n in notes]

        if include_water:
            water = self.db.query(WaterIntake).filter(
                WaterIntake.user_id == self.user_id,
                WaterIntake.date >= start_date,
                WaterIntake.date <= end_date
            ).all()
            data["water_intake"] = [self._model_to_dict(w) for w in water]

        return data

    def _model_to_dict(self, model) -> Dict:
        """Convert SQLAlchemy model to dictionary."""
        result = {}
        for column in model.__table__.columns:
            value = getattr(model, column.name)
            if isinstance(value, (datetime, date)):
                result[column.name] = value.isoformat()
            else:
                result[column.name] = value
        return result

    def _export_json(self, data: Dict, filename: str) -> Path:
        """Export data as JSON."""
        file_path = self.export_dir / f"{filename}.json"

        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2, default=str)

        logger.info(f"Exported data to JSON: {file_path}")
        return file_path

    def _export_csv(self, data: Dict, filename: str) -> Path:
        """Export data as CSV files (one per data type)."""
        # Create a directory for this export
        export_subdir = self.export_dir / filename
        export_subdir.mkdir(parents=True, exist_ok=True)

        # Export metadata
        metadata_path = export_subdir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(data["metadata"], f, indent=2)

        # Export each data type as separate CSV
        for key, values in data.items():
            if key == "metadata" or not values:
                continue

            if isinstance(values, list) and len(values) > 0:
                df = pd.DataFrame(values)
                csv_path = export_subdir / f"{key}.csv"
                df.to_csv(csv_path, index=False)
                logger.info(f"Exported {key} to CSV: {csv_path}")

        # Create a README
        readme_path = export_subdir / "README.txt"
        with open(readme_path, 'w') as f:
            f.write(f"Health Tracker Data Export\n")
            f.write(f"Date Range: {data['metadata']['start_date']} to {data['metadata']['end_date']}\n")
            f.write(f"Export Date: {data['metadata']['export_date']}\n\n")
            f.write(f"Files included:\n")
            for key in data.keys():
                if key != "metadata" and data[key]:
                    f.write(f"  - {key}.csv\n")

        logger.info(f"CSV export completed in directory: {export_subdir}")
        return export_subdir

    def _export_parquet(self, data: Dict, filename: str) -> Path:
        """Export data as Parquet files (optimized for data analysis)."""
        # Create a directory for this export
        export_subdir = self.export_dir / filename
        export_subdir.mkdir(parents=True, exist_ok=True)

        # Export metadata
        metadata_path = export_subdir / "metadata.json"
        with open(metadata_path, 'w') as f:
            json.dump(data["metadata"], f, indent=2)

        # Export each data type as separate Parquet file
        for key, values in data.items():
            if key == "metadata" or not values:
                continue

            if isinstance(values, list) and len(values) > 0:
                df = pd.DataFrame(values)
                parquet_path = export_subdir / f"{key}.parquet"
                df.to_parquet(parquet_path, index=False, engine='pyarrow')
                logger.info(f"Exported {key} to Parquet: {parquet_path}")

        logger.info(f"Parquet export completed in directory: {export_subdir}")
        return export_subdir

    def generate_ai_analysis_prompt(self, start_date: date, end_date: date) -> str:
        """
        Generate a prompt that can be used with an AI to analyze the exported data.

        Returns:
            str: A formatted prompt for AI analysis
        """
        prompt = f"""I have health tracking data from {start_date} to {end_date} that I'd like you to analyze.
The data includes:

1. **Garmin Data**: Daily activity metrics including steps, heart rate, sleep quality, stress levels, body battery, and calories
2. **Activities/Workouts**: Exercise sessions with duration, intensity, and heart rate data
3. **Food & Drinks**: Meals and beverages consumed with timestamps and nutritional info
4. **Medications**: Medication schedule with dosage and timing
5. **Sickness**: Illness symptoms and fever tracking
6. **Seizures**: Epileptic seizure events with severity, triggers, and context
7. **Daily Notes**: Mood and energy levels with journal entries
8. **Water Intake**: Hydration tracking throughout the day

Please analyze this data and provide insights on:

1. **Patterns & Correlations**:
   - Are there correlations between sleep quality and seizure frequency?
   - How do stress levels relate to sickness events?
   - What's the relationship between activity levels and sleep quality?

2. **Health Trends**:
   - Overall activity trends (steps, exercise)
   - Sleep patterns and quality over time
   - Heart rate and stress level trends

3. **Seizure Analysis** (if applicable):
   - Frequency and patterns
   - Potential triggers (lack of sleep, high stress, specific foods, etc.)
   - Time of day patterns
   - Correlation with medication adherence

4. **Recommendations**:
   - Areas for improvement
   - Potential warning signs to watch for
   - Lifestyle adjustments that might help

5. **Medication Adherence**:
   - Consistency in taking medications
   - Any gaps in medication schedule

Please provide specific, actionable insights based on the data."""

        return prompt


def create_analysis_summary(db: Session, user_id: int, start_date: date, end_date: date) -> Dict:
    """
    Create a summary of health data for quick analysis.

    Returns:
        Dict with summary statistics
    """
    summary = {
        "date_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
            "days": (end_date - start_date).days + 1
        }
    }

    # Garmin metrics averages
    garmin_data = db.query(GarminData).filter(
        GarminData.user_id == user_id,
        GarminData.date >= start_date,
        GarminData.date <= end_date
    ).all()

    if garmin_data:
        summary["garmin_summary"] = {
            "days_with_data": len(garmin_data),
            "avg_steps": sum(g.steps or 0 for g in garmin_data) / len(garmin_data),
            "avg_sleep_hours": sum((g.sleep_duration_seconds or 0) / 3600 for g in garmin_data) / len(garmin_data),
            "avg_resting_hr": sum(g.resting_heart_rate or 0 for g in garmin_data) / len([g for g in garmin_data if g.resting_heart_rate]),
            "avg_stress": sum(g.avg_stress_level or 0 for g in garmin_data) / len([g for g in garmin_data if g.avg_stress_level]),
        }

    # Seizure summary
    seizures = db.query(Seizure).filter(
        Seizure.user_id == user_id,
        Seizure.date >= start_date,
        Seizure.date <= end_date
    ).all()

    summary["seizure_summary"] = {
        "total_seizures": len(seizures),
        "avg_per_week": len(seizures) / ((end_date - start_date).days / 7) if (end_date - start_date).days > 0 else 0,
        "severity_breakdown": {}
    }

    for seizure in seizures:
        severity = seizure.severity or "unknown"
        summary["seizure_summary"]["severity_breakdown"][severity] = \
            summary["seizure_summary"]["severity_breakdown"].get(severity, 0) + 1

    # Medication adherence
    medications = db.query(Medication).filter(
        Medication.user_id == user_id,
        Medication.date >= start_date,
        Medication.date <= end_date
    ).all()

    summary["medication_summary"] = {
        "total_doses": len(medications),
        "days_with_medications": len(set(m.date for m in medications)),
        "unique_medications": len(set(m.medication_name for m in medications))
    }

    # Sickness days
    sickness = db.query(Sickness).filter(
        Sickness.user_id == user_id,
        Sickness.date >= start_date,
        Sickness.date <= end_date
    ).all()

    summary["sickness_summary"] = {
        "days_sick": len(sickness),
        "days_with_fever": len([s for s in sickness if s.has_fever])
    }

    return summary
