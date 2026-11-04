from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc, func
from sqlalchemy.orm import Session
from app.database.sqlalchemy_db import get_db, DB_PATH
from app.models.database_models import SensorReading, Device, Alert, Prediction, AIAnalysis
from app.schemas.database import ReadingOut, DeviceOut, AlertOut, PredictionOut
from app.services.persistence import list_readings, parse_dt

router = APIRouter(tags=["persistent database"])

def parse_filter(value: str | None, field: str):
    if value is None: return None
    try: return parse_dt(value)
    except (ValueError, TypeError): raise HTTPException(status_code=422, detail=f"Invalid {field}; use ISO-8601, e.g. 2026-11-03T10:00:00Z")

@router.get("/database/status")
def database_status(db: Session = Depends(get_db)):
    try:
        counts = {
            "sensor_readings": db.scalar(select(func.count()).select_from(SensorReading)) or 0,
            "devices": db.scalar(select(func.count()).select_from(Device)) or 0,
            "alerts": db.scalar(select(func.count()).select_from(Alert)) or 0,
            "predictions": db.scalar(select(func.count()).select_from(Prediction)) or 0,
            "ai_analysis": db.scalar(select(func.count()).select_from(AIAnalysis)) or 0,
        }
        return {"status": "connected", "database": "SQLite", "database_file": DB_PATH.name, "tables": counts}
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {type(exc).__name__}")

@router.get("/readings", response_model=list[ReadingOut])
def readings(limit: int = Query(100, ge=1, le=1000), device_id: str | None = None,
             start_date: str | None = None, end_date: str | None = None, db: Session = Depends(get_db)):
    start = parse_filter(start_date, "start_date"); end = parse_filter(end_date, "end_date")
    if start and end and start > end: raise HTTPException(status_code=422, detail="start_date must be earlier than or equal to end_date")
    return list_readings(db, limit, start, end, device_id)

@router.get("/readings/latest", response_model=ReadingOut)
def latest_reading(db: Session = Depends(get_db)):
    item = db.scalar(select(SensorReading).order_by(desc(SensorReading.timestamp), desc(SensorReading.id)).limit(1))
    if item is None: raise HTTPException(status_code=404, detail="No readings have been stored yet")
    return item

@router.get("/readings/history", response_model=list[ReadingOut])
def reading_history(start_date: str | None = None, end_date: str | None = None,
                    device_id: str | None = None, limit: int = Query(500, ge=1, le=5000), db: Session = Depends(get_db)):
    start = parse_filter(start_date, "start_date"); end = parse_filter(end_date, "end_date")
    if start and end and start > end: raise HTTPException(status_code=422, detail="start_date must be earlier than or equal to end_date")
    return list_readings(db, limit, start, end, device_id)

@router.get("/devices", response_model=list[DeviceOut])
def devices(db: Session = Depends(get_db)):
    return list(db.scalars(select(Device).order_by(Device.id)).all())

@router.get("/devices/{device_id}", response_model=DeviceOut)
def device_info(device_id: str, db: Session = Depends(get_db)):
    item = db.get(Device, device_id)
    if item is None: raise HTTPException(status_code=404, detail="Device not found")
    return item

@router.get("/alerts", response_model=list[AlertOut])
def alerts(limit: int = Query(100, ge=1, le=1000), unresolved_only: bool = False, db: Session = Depends(get_db)):
    stmt = select(Alert).order_by(desc(Alert.timestamp), desc(Alert.id)).limit(limit)
    if unresolved_only: stmt = stmt.where(Alert.resolved.is_(False))
    return list(db.scalars(stmt).all())

@router.get("/predictions", response_model=list[PredictionOut])
def predictions(limit: int = Query(100, ge=1, le=1000), db: Session = Depends(get_db)):
    return list(db.scalars(select(Prediction).order_by(desc(Prediction.created_at), desc(Prediction.id)).limit(limit)).all())
