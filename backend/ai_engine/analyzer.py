"""Core statistical analysis for Ocean Eye AI."""

from statistics import mean, stdev

from sqlalchemy import select, desc

from app.database.sqlalchemy_db import SessionLocal
from app.models.database_models import SensorReading

from ai_engine import config


def fetch_readings(limit=None):
    """Retrieve actual stored sensor readings from the Phase 4 database."""

    if limit is None:
        limit = config.MAX_READINGS

    with SessionLocal() as db:
        statement = (
            select(SensorReading)
            .order_by(
                desc(SensorReading.timestamp),
                desc(SensorReading.id)
            )
            .limit(limit)
        )

        records = list(db.scalars(statement).all())

    # Reverse so analysis uses oldest-to-newest order.
    records.reverse()

    return [
        {
            "id": item.id,
            "device_id": item.device_id,
            "temperature": item.temperature,
            "turbidity": item.turbidity,
            "latitude": item.latitude,
            "longitude": item.longitude,
            "timestamp": item.timestamp.isoformat()
            if item.timestamp else None,
        }
        for item in records
    ]


def calculate_statistics(values):
    """Calculate basic statistics for valid numeric measurements."""

    if not values:
        return {
            "count": 0,
            "average": None,
            "minimum": None,
            "maximum": None,
            "standard_deviation": None,
        }

    return {
        "count": len(values),
        "average": round(mean(values), 3),
        "minimum": round(min(values), 3),
        "maximum": round(max(values), 3),
        "standard_deviation": (
            round(stdev(values), 3) if len(values) >= 2 else None
        ),
    }


def analyze_sensor_data(readings=None):
    """Analyze actual sensor measurements without making pollution claims."""

    if readings is None:
        readings = fetch_readings()

    temperatures = [
        float(item["temperature"])
        for item in readings
        if item.get("temperature") is not None
    ]

    turbidities = [
        float(item["turbidity"])
        for item in readings
        if item.get("turbidity") is not None
    ]

    temperature_stats = calculate_statistics(temperatures)
    turbidity_stats = calculate_statistics(turbidities)

    warnings = []
    observations = []

    # Check measurement plausibility.
    for item in readings:
        temperature = item.get("temperature")
        turbidity = item.get("turbidity")

        if temperature is not None:
            if not (
                config.TEMPERATURE_MIN_C
                <= temperature
                <= config.TEMPERATURE_MAX_C
            ):
                warnings.append({
                    "type": "temperature_out_of_configured_range",
                    "reading_id": item["id"],
                    "value": temperature,
                    "explanation": (
                        "Temperature is outside the configured "
                        "measurement plausibility range."
                    ),
                })

        if turbidity is not None and turbidity < config.TURBIDITY_MIN_NTU:
            warnings.append({
                "type": "negative_turbidity",
                "reading_id": item["id"],
                "value": turbidity,
                "explanation": (
                    "Turbidity cannot be negative under this "
                    "measurement configuration."
                ),
            })

    # Compare the two latest available temperature measurements.
    valid_temperature_readings = [
        item for item in readings
        if item.get("temperature") is not None
    ]

    if len(valid_temperature_readings) >= 2:
        previous = valid_temperature_readings[-2]["temperature"]
        latest = valid_temperature_readings[-1]["temperature"]
        change = latest - previous

        if abs(change) >= config.TEMPERATURE_CHANGE_C:
            observations.append({
                "type": "sudden_temperature_change",
                "change": round(change, 3),
                "explanation": (
                    "Temperature changed significantly between "
                    "the two latest available measurements."
                ),
            })

    # Compare the two latest available turbidity measurements.
    valid_turbidity_readings = [
        item for item in readings
        if item.get("turbidity") is not None
    ]

    if len(valid_turbidity_readings) >= 2:
        previous = valid_turbidity_readings[-2]["turbidity"]
        latest = valid_turbidity_readings[-1]["turbidity"]
        change = latest - previous

        if abs(change) >= config.TURBIDITY_CHANGE_NTU:
            observations.append({
                "type": "sudden_turbidity_change",
                "change": round(change, 3),
                "explanation": (
                    "Turbidity changed significantly between "
                    "the two latest available measurements. "
                    "This alone does not establish pollution."
                ),
            })

    enough_data = len(readings) >= config.MIN_READINGS

    if not readings:
        status = "no_data"
    elif not enough_data:
        status = "insufficient_data"
    else:
        status = "analysis_available"

    if not enough_data:
        observations.append({
            "type": "insufficient_history",
            "explanation": (
                f"At least {config.MIN_READINGS} readings are required "
                "for the configured statistical analysis."
            ),
        })

    if warnings:
        observations.append({
            "type": "measurement_quality_warning",
            "explanation": (
                "One or more measurements are outside configured "
                "plausibility limits. Check the sensor and its data."
            ),
        })

    return {
        "engine": "Ocean Eye AI Statistical Analysis Engine",
        "data_source": "Phase 4 sensor_readings database table",
        "status": status,
        "total_readings": len(readings),
        "temperature": temperature_stats,
        "turbidity": turbidity_stats,
        "latest_reading": readings[-1] if readings else None,
        "observations": observations,
        "warnings": warnings,
        "scientific_note": (
            "These results describe sensor measurements. "
            "Temperature and turbidity alone cannot prove pollution "
            "or determine its cause."
        ),
    }