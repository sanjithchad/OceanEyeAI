
"""Environmental risk intelligence API."""

from fastapi import APIRouter, Query

from ai_engine.risk import get_current_assessment
from app.database.sqlalchemy_db import SessionLocal
from app.models.database_models import Alert
from sqlalchemy import select, desc


router = APIRouter(prefix="/risk", tags=["environmental risk"])


@router.get("/current")
async def current_risk():
    return await get_current_assessment()


@router.get("/explanation")
async def risk_explanation():
    result = await get_current_assessment()
    return {
        "indicator": result["indicator"],
        "category": result["category"],
        "explanation": result["explanation"],
        "contributing_factors": result["factors"],
        "warnings": result["warnings"],
        "limitations": result["limitations"],
    }


@router.get("/status")
async def risk_status():
    result = await get_current_assessment()
    return {
        "status": result["status"],
        "indicator": result["indicator"],
        "category": result["category"],
        "data_quality": result["data_quality"],
        "sensor_health": result["sensor_health"],
        "assessed_at": result["assessed_at"],
    }


@router.get("/history")
async def risk_history(limit: int = Query(default=50, ge=1, le=500)):
    with SessionLocal() as db:
        alerts = db.scalars(
            select(Alert)
            .where(Alert.alert_type == "environmental_risk")
            .order_by(desc(Alert.timestamp))
            .limit(limit)
        ).all()

        return {
            "count": len(alerts),
            "items": [
                {
                    "id": item.id,
                    "severity": item.severity,
                    "description": item.description,
                    "timestamp": item.timestamp.isoformat(),
                    "resolved": item.resolved,
                }
                for item in alerts
            ],
        }
