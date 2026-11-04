"""Ocean Eye AI analysis API endpoints."""

from fastapi import APIRouter, Query

from ai_engine.analyzer import analyze_sensor_data
from ai_engine.anomaly import detect_anomalies
from ai_engine.trends import analyze_trends

router = APIRouter(prefix="/ai", tags=["Ocean Eye AI Analysis"])


@router.get("/analyze")
def analyze():
    """Analyze actual stored sensor measurements."""
    return analyze_sensor_data()


@router.get("/anomalies")
def anomalies(
    limit: int = Query(default=500, ge=1, le=5000)
):
    """Detect unusual sensor measurements."""
    from ai_engine.analyzer import fetch_readings

    readings = fetch_readings(limit)
    return detect_anomalies(readings)


@router.get("/trends")
def trends():
    """Analyze historical sensor measurement trends."""
    return analyze_trends()


@router.get("/summary")
def summary():
    """Return a combined analysis summary."""

    analysis = analyze_sensor_data()

    return {
        "project": "Ocean Eye AI",
        "analysis_engine": "Phase 5 Statistical Analysis Engine",
        "status": analysis["status"],
        "readings_analyzed": analysis["total_readings"],
        "temperature": analysis["temperature"],
        "turbidity": analysis["turbidity"],
        "observations": analysis["observations"],
        "anomaly_count": detect_anomalies()["anomaly_count"],
        "trends": analyze_trends(),
        "scientific_note": analysis["scientific_note"],
    }