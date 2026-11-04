from datetime import datetime, timezone
from fastapi import APIRouter, Query
from app.models.telemetry import TelemetryIn
from app.database.telemetry_store import (
    insert_reading, get_latest_readings, get_recent_readings
)

router = APIRouter(prefix="/telemetry", tags=["telemetry"])


@router.post("", status_code=201)
async def ingest_telemetry(reading: TelemetryIn):
    """Accept one validated sensor observation. Hardware integration is not configured yet."""
    payload = reading.model_dump()
    payload["observed_at"] = payload["observed_at"].astimezone(timezone.utc).isoformat()
    return {
        "accepted": True,
        "message": "Observation stored. Source is explicitly recorded.",
        "reading": insert_reading(payload),
    }


@router.get("/latest")
async def latest_telemetry(limit: int = Query(default=50, ge=1, le=200)):
    items = get_latest_readings(limit)
    return {
        "items": items,
        "count": len(items),
        "data_status": "no_sensor_data" if not items else "observations_available",
    }


@router.get("/{sensor_id}/history")
async def telemetry_history(
    sensor_id: str,
    limit: int = Query(default=100, ge=1, le=1000),
):
    items = get_recent_readings(sensor_id, limit)
    return {"sensor_id": sensor_id, "items": items, "count": len(items)}
