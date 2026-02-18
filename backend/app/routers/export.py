from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import date, timedelta
import os

from app.database import get_db
from app import schemas
from app.routers.garmin import get_default_user
from app.services.export_service import ExportService, create_analysis_summary
from app.config import settings

router = APIRouter(prefix="/export", tags=["export"])


@router.post("/", response_model=schemas.ExportResponse)
def export_data(
    request: schemas.ExportRequest,
    db: Session = Depends(get_db),
    user = Depends(get_default_user)
):
    """
    Export health data for a date range in specified format.

    Supported formats:
    - json: Single JSON file with all data
    - csv: Multiple CSV files (one per data type) in a directory
    - parquet: Multiple Parquet files (optimized for data analysis)
    """
    export_service = ExportService(db, user.id, settings.export_dir)

    result = export_service.export_data(
        start_date=request.start_date,
        end_date=request.end_date,
        format=request.format,
        include_garmin=request.include_garmin,
        include_food=request.include_food,
        include_medications=request.include_medications,
        include_sickness=request.include_sickness,
        include_seizures=request.include_seizures,
        include_notes=request.include_notes,
        include_water=request.include_water,
        include_health_events=request.include_health_events,
        garmin_full_raw_data=request.garmin_full_raw_data
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result["message"])

    return schemas.ExportResponse(**result)


@router.get("/download/{filename}")
def download_export(filename: str):
    """Download an exported file."""
    file_path = os.path.join(settings.export_dir, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@router.get("/ai-prompt")
def get_ai_analysis_prompt(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    user = Depends(get_default_user)
):
    """
    Get a pre-formatted prompt for AI analysis along with data summary.
    Use this to prepare data for AI analysis tools like Claude, GPT, etc.
    """
    export_service = ExportService(db, user.id, settings.export_dir)
    prompt = export_service.generate_ai_analysis_prompt(start_date, end_date)
    summary = create_analysis_summary(db, user.id, start_date, end_date)

    return {
        "prompt": prompt,
        "summary": summary,
        "instructions": "Export your data using the /export endpoint, then provide both the exported data and this prompt to an AI for analysis."
    }


@router.get("/summary")
def get_analysis_summary(
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    user = Depends(get_default_user)
):
    """Get a statistical summary of health data for quick analysis."""
    return create_analysis_summary(db, user.id, start_date, end_date)
