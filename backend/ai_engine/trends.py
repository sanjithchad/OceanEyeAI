"""Historical trend analysis for Ocean Eye AI."""

from statistics import mean

from ai_engine import config
from ai_engine.analyzer import fetch_readings


def calculate_trend(readings, parameter):
    """Calculate the direction of a sensor measurement trend."""

    values = [
        float(item[parameter])
        for item in readings
        if item.get(parameter) is not None
    ]

    if len(values) < config.MIN_READINGS:
        return {
            "status": "insufficient_data",
            "direction": "unknown",
            "average": None,
            "change": None,
            "explanation": (
                "Not enough valid measurements to establish a trend."
            ),
        }

    window = min(config.TREND_WINDOW, len(values))
    recent = values[-window:]

    half = max(1, window // 2)

    earlier_average = mean(recent[:half])
    recent_average = mean(recent[-half:])

    change = recent_average - earlier_average

    if parameter == "temperature":
        threshold = config.TEMPERATURE_CHANGE_C
    else:
        threshold = config.TURBIDITY_CHANGE_NTU

    if change > threshold:
        direction = "increasing"
    elif change < -threshold:
        direction = "decreasing"
    else:
        direction = "stable"

    return {
        "status": "available",
        "direction": direction,
        "average": round(mean(values), 3),
        "earlier_average": round(earlier_average, 3),
        "recent_average": round(recent_average, 3),
        "change": round(change, 3),
        "readings_used": len(values),
        "explanation": (
            f"{parameter.title()} measurements show a {direction} "
            "pattern when comparing recent and earlier readings."
        ),
    }


def analyze_trends(readings=None):
    """Analyze historical temperature and turbidity patterns."""

    if readings is None:
        readings = fetch_readings()

    return {
        "status": (
            "no_data" if not readings
            else "analyzed"
        ),
        "readings_checked": len(readings),
        "temperature": calculate_trend(readings, "temperature"),
        "turbidity": calculate_trend(readings, "turbidity"),
        "scientific_note": (
            "Trends describe observed sensor measurements. "
            "They do not independently establish environmental causes."
        ),
    }