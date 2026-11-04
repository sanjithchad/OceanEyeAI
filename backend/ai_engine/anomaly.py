"""Rolling statistical anomaly detection for Ocean Eye AI."""

from statistics import mean, stdev

from ai_engine import config
from ai_engine.analyzer import fetch_readings


def detect_anomalies(readings=None):
    """Detect unusual measurements using a recent historical baseline."""

    if readings is None:
        readings = fetch_readings()

    anomalies = []

    parameters = [
        {
            "name": "temperature",
            "label": "Water temperature",
            "unit": "C",
            "minimum": config.TEMPERATURE_MIN_C,
            "maximum": config.TEMPERATURE_MAX_C,
            "minimum_deviation": 0.5,
        },
        {
            "name": "turbidity",
            "label": "Water turbidity",
            "unit": "NTU",
            "minimum": config.TURBIDITY_MIN_NTU,
            "maximum": None,
            "minimum_deviation": 3.0,
        },
    ]

    for parameter in parameters:
        name = parameter["name"]
        label = parameter["label"]

        valid = []

        for item in readings:
            value = item.get(name)

            if isinstance(value, (int, float)):
                value = float(value)

                if value == value and abs(value) != float("inf"):
                    valid.append((item, value))

        # Check configured measurement plausibility limits.
        for item, value in valid:
            outside_range = value < parameter["minimum"]

            if parameter["maximum"] is not None:
                outside_range = (
                    outside_range or value > parameter["maximum"]
                )

            if outside_range:
                anomalies.append({
                    "type": "measurement_out_of_range",
                    "parameter": name,
                    "reading_id": item["id"],
                    "device_id": item["device_id"],
                    "value": value,
                    "unit": parameter["unit"],
                    "severity": "high",
                    "explanation": (
                        f"{label} is outside configured measurement "
                        "plausibility limits. Check the sensor and data."
                    ),
                })

        # Compare each reading with only the recent previous readings.
        for index in range(config.MIN_READINGS, len(valid)):
            item, current = valid[index]

            baseline_start = max(0, index - 20)
            history = [
                value
                for _, value in valid[baseline_start:index]
            ]

            baseline_mean = mean(history)
            baseline_std = stdev(history) if len(history) >= 2 else 0.0

            deviation = abs(current - baseline_mean)

            statistical_limit = max(
                config.ANOMALY_STD_DEV * baseline_std,
                parameter["minimum_deviation"],
            )

            if baseline_std > 0:
                z_score = (current - baseline_mean) / baseline_std
            else:
                z_score = None

            if deviation >= statistical_limit:
                anomalies.append({
                    "type": "statistical_anomaly",
                    "parameter": name,
                    "reading_id": item["id"],
                    "device_id": item["device_id"],
                    "value": round(current, 3),
                    "unit": parameter["unit"],
                    "historical_average": round(baseline_mean, 3),
                    "z_score": (
                        round(z_score, 3) if z_score is not None else None
                    ),
                    "severity": "medium",
                    "explanation": (
                        f"{label} differs substantially from its recent "
                        "historical baseline. This is a statistical "
                        "anomaly, not proof of an environmental event."
                    ),
                })

    # Identify missing measurements.
    for item in readings:
        for name in ["temperature", "turbidity"]:
            if item.get(name) is None:
                anomalies.append({
                    "type": "missing_measurement",
                    "parameter": name,
                    "reading_id": item["id"],
                    "device_id": item["device_id"],
                    "value": None,
                    "severity": "low",
                    "explanation": (
                        f"The {name} measurement is missing. "
                        "Check sensor availability and data transmission."
                    ),
                })

    return {
        "status": (
            "no_data" if not readings
            else "analyzed" if len(readings) >= config.MIN_READINGS
            else "insufficient_data"
        ),
        "readings_checked": len(readings),
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
        "method": "Rolling 20-reading statistical baseline and configured limits",
        "scientific_note": (
            "An anomaly identifies an unusual measurement. "
            "It does not establish pollution, sensor failure, "
            "or the cause of an environmental change."
        ),
    }