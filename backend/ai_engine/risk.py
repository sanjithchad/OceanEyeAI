
"""Explainable prototype environmental condition assessment."""

from datetime import datetime, timezone

from ai_engine.analyzer import fetch_readings
from ai_engine.anomaly import detect_anomalies
from ai_engine.trends import analyze_trends
from app.services.simulator import simulator


CATEGORIES = [
    (75, "high"),
    (50, "elevated"),
    (25, "observation_required"),
    (0, "normal"),
]


def assess_environment(readings=None, sensor_status=None):
    """Calculate a transparent 0-100 prototype condition indicator."""

    if readings is None:
        readings = fetch_readings(limit=500)

    if sensor_status is None:
        sensor_status = {
            "sensor_status": "unknown",
            "connection_status": "unknown",
            "failure_mode": False,
        }

    latest = readings[-1] if readings else {}
    factors = []
    warnings = []
    score = 0

    def add_factor(name, points, explanation):
        nonlocal score
        score += points
        factors.append({
            "factor": name,
            "points": points,
            "explanation": explanation,
        })

    temperature = latest.get("temperature")
    turbidity = latest.get("turbidity")

    # Sensor availability is evaluated separately from environmental signals.
    missing = []
    if temperature is None:
        missing.append("temperature")
    if turbidity is None:
        missing.append("turbidity")

    sensor_failed = (
        sensor_status.get("failure_mode", False)
        or sensor_status.get("connection_status") == "disconnected"
        or sensor_status.get("sensor_status") == "offline"
    )

    if sensor_failed:
        warnings.append({
            "type": "sensor_failure",
            "severity": "warning",
            "explanation": "Sensor connection is unavailable. Environmental measurements cannot currently be verified.",
        })

    if missing:
        warnings.append({
            "type": "missing_measurements",
            "severity": "warning",
            "parameters": missing,
            "explanation": "One or more latest sensor measurements are missing.",
        })

    valid_count = sum(
        1 for item in readings
        if item.get("temperature") is not None
        and item.get("turbidity") is not None
    )

    if len(readings) < 5:
        warnings.append({
            "type": "insufficient_history",
            "severity": "warning",
            "explanation": "At least five readings are required for basic historical assessment.",
        })

    # Configured measurement plausibility checks, not ecological limits.
    if temperature is not None and not -2 <= temperature <= 45:
        add_factor(
            "temperature_measurement_quality",
            15,
            "Temperature is outside configured measurement plausibility limits. Verify the sensor.",
        )

    if turbidity is not None and turbidity < 0:
        add_factor(
            "turbidity_measurement_quality",
            15,
            "Turbidity is negative and requires sensor/data verification.",
        )

    # Trends and anomaly results use the existing analysis engines.
    trends = analyze_trends(readings)
    anomaly_result = detect_anomalies(readings)

    if temperature is not None:
        if trends["temperature"]["direction"] == "increasing":
            add_factor(
                "temperature_trend",
                10,
                "Temperature is increasing relative to the recent historical window.",
            )

    if turbidity is not None:
        if trends["turbidity"]["direction"] == "increasing":
            add_factor(
                "turbidity_trend",
                15,
                "Turbidity is increasing relative to the recent historical window. This does not establish pollution.",
            )

    recent_ids = {
        str(item.get("id"))
        for item in readings[-5:]
    }

    recent_anomalies = [
        item for item in anomaly_result.get("anomalies", [])
        if str(item.get("reading_id")) in recent_ids
        and item.get("type") == "statistical_anomaly"
    ]

    for parameter in {"temperature", "turbidity"}:
        if any(item.get("parameter") == parameter for item in recent_anomalies):
            add_factor(
                f"{parameter}_statistical_anomaly",
                15,
                f"Recent {parameter} measurements differ from their historical baseline. This is not proof of an environmental event.",
            )

    # Sensor failure must never increase the environmental score.
    score = min(100, max(0, score))

    if score >= 75:
        category = "high"
    elif score >= 50:
        category = "elevated"
    elif score >= 25:
        category = "observation_required"
    else:
        category = "normal"

    data_quality = (
        "unavailable" if sensor_failed
        else "incomplete" if missing or len(readings) < 5
        else "available"
    )

    if sensor_failed:
        confidence_note = "Environmental condition is unverified because the sensor is disconnected."
    elif data_quality != "available":
        confidence_note = "Assessment is limited by missing measurements or insufficient historical coverage."
    else:
        confidence_note = "Assessment uses available sensor readings and historical statistical indicators. It is not scientifically validated."

    explanation = (
        f"The prototype indicator is {score}/100 ({category}). "
        f"{len(factors)} contributing factor(s) were identified. "
        f"{confidence_note}"
    )

    if not factors:
        explanation += " No configured unusual-condition indicators were detected."

    return {
        "status": "assessed" if readings else "no_data",
        "indicator": score,
        "category": category,
        "warning_level": category,
        "factors": factors,
        "warnings": warnings,
        "explanation": explanation,
        "latest_reading": latest or None,
        "trends": trends,
        "anomaly_summary": {
            "status": anomaly_result["status"],
            "anomaly_count": anomaly_result["anomaly_count"],
            "recent_anomalies": recent_anomalies,
        },
        "data_quality": {
            "status": data_quality,
            "total_readings": len(readings),
            "valid_readings": valid_count,
            "missing_latest_measurements": missing,
        },
        "sensor_health": {
            "status": sensor_status.get("sensor_status", "unknown"),
            "connection_status": sensor_status.get("connection_status", "unknown"),
            "failure_mode": sensor_failed,
        },
        "recommended_actions": [
            "Verify sensor connectivity and measurement quality."
            if sensor_failed or missing
            else "Continue routine environmental monitoring.",
            "Review recent readings and trends."
            if factors
            else "Continue collecting historical measurements.",
            "Do not interpret turbidity alone as confirmed pollution.",
        ],
        "assessed_at": datetime.now(timezone.utc).isoformat(),
        "limitations": [
            "Prototype software indicator, not a certified environmental risk measurement.",
            "Thresholds are demonstration scoring rules, not ecological safety limits.",
            "Temperature and turbidity alone cannot establish pollution or ecological danger.",
            "Sensor anomalies and environmental changes are not interchangeable.",
        ],
    }


async def get_current_assessment():
    """Assess stored readings using the live simulator health status."""
    status = await simulator.status()
    return assess_environment(sensor_status=status)
