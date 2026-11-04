
"""Ocean Eye AI experimental temperature forecasting engine."""

import math
from datetime import datetime, timedelta, timezone
from statistics import mean, stdev

from sqlalchemy import select, asc

from app.database.sqlalchemy_db import SessionLocal
from app.models.database_models import SensorReading


HORIZONS = {
    "1hour": ("1 hour", 1),
    "6hours": ("6 hours", 6),
    "24hours": ("24 hours", 24),
    "3days": ("3 days", 72),
    "7days": ("7 days", 168),
}


def load_temperature_data():
    """Load and clean historical temperatures from SQLite."""

    with SessionLocal() as db:
        statement = (
            select(SensorReading)
            .order_by(
                asc(SensorReading.timestamp),
                asc(SensorReading.id)
            )
            .limit(5000)
        )
        records = list(db.scalars(statement).all())

    cleaned = []

    for record in records:
        value = record.temperature
        timestamp = record.timestamp

        if value is None or timestamp is None:
            continue

        try:
            value = float(value)

            if not math.isfinite(value):
                continue

            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)

            cleaned.append((timestamp, value))

        except (TypeError, ValueError):
            continue

    cleaned.sort(key=lambda item: item[0])
    return cleaned


def fit_linear_regression(points):
    """Fit a simple linear regression against elapsed time."""

    if len(points) < 2:
        return None

    origin = points[0][0]
    x_values = [
        (timestamp - origin).total_seconds() / 3600
        for timestamp, _ in points
    ]
    y_values = [value for _, value in points]

    x_mean = mean(x_values)
    y_mean = mean(y_values)

    denominator = sum(
        (x - x_mean) ** 2 for x in x_values
    )

    if denominator == 0:
        return None

    slope = sum(
        (x - x_mean) * (y - y_mean)
        for x, y in zip(x_values, y_values)
    ) / denominator

    intercept = y_mean - slope * x_mean

    return {
        "origin": origin,
        "slope": slope,
        "intercept": intercept,
    }


def regression_predict(model, timestamp):
    hours = (
        timestamp - model["origin"]
    ).total_seconds() / 3600

    return model["intercept"] + model["slope"] * hours


def calculate_metrics(actual, predicted):
    """Calculate chronological holdout evaluation metrics."""

    errors = [
        a - p for a, p in zip(actual, predicted)
    ]

    if not errors:
        return {
            "mae": None,
            "rmse": None,
            "mape_percent": None,
        }

    mae = mean(abs(error) for error in errors)

    rmse = math.sqrt(
        mean(error ** 2 for error in errors)
    )

    # MAPE is not meaningful for Celsius temperatures because
    # Celsius has an arbitrary zero point.
    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "mape_percent": None,
        "mape_note": (
            "MAPE omitted: percentage errors are not meaningful "
            "for Celsius temperatures because Celsius has an "
            "arbitrary zero point."
        ),
    }


def evaluate_models(data):
    """Compare persistence and linear regression chronologically."""

    if len(data) < 20:
        return {
            "status": "insufficient_data",
            "selected_model": "persistence",
            "models": {},
            "message": (
                "At least 20 valid temperature readings are "
                "required for model comparison."
            ),
        }

    split = int(len(data) * 0.8)
    training = data[:split]
    testing = data[split:]

    training_values = [value for _, value in training]
    actual = [value for _, value in testing]

    # Persistence baseline: previous observed temperature.
    persistence_predictions = [
        data[index - 1][1]
        for index in range(split, len(data))
    ]

    # Regression is fitted only on the training section.
    regression = fit_linear_regression(training)

    regression_predictions = [
        regression_predict(regression, timestamp)
        for timestamp, _ in testing
    ]

    persistence_metrics = calculate_metrics(
        actual, persistence_predictions
    )

    regression_metrics = calculate_metrics(
        actual, regression_predictions
    )

    selected = (
        "linear_regression"
        if regression_metrics["mae"] < persistence_metrics["mae"]
        else "persistence"
    )

    selected_metrics = (
        regression_metrics
        if selected == "linear_regression"
        else persistence_metrics
    )

    residuals = (
        [
            a - p
            for a, p in zip(actual, regression_predictions)
        ]
        if selected == "linear_regression"
        else [
            a - p
            for a, p in zip(actual, persistence_predictions)
        ]
    )

    uncertainty = (
        math.sqrt(mean(error ** 2 for error in residuals))
        if residuals else 0.0
    )

    return {
        "status": "evaluated",
        "selected_model": selected,
        "training_readings": len(training_values),
        "testing_readings": len(testing),
        "models": {
            "persistence": persistence_metrics,
            "linear_regression": regression_metrics,
        },
        "selected_metrics": selected_metrics,
        "holdout_rmse": round(uncertainty, 4),
    }


def generate_prediction(horizon):
    """Generate one experimental future temperature prediction."""

    if horizon not in HORIZONS:
        return {"status": "invalid_horizon"}

    label, hours = HORIZONS[horizon]
    data = load_temperature_data()

    if not data:
        return {
            "status": "no_data",
            "message": "No valid historical temperature data exists.",
        }

    current_time, current_temperature = data[-1]
    now = datetime.now(timezone.utc)

    future_time = now + timedelta(hours=hours)

    duration_hours = (
        data[-1][0] - data[0][0]
    ).total_seconds() / 3600

    evaluation = evaluate_models(data)

    if evaluation["status"] == "evaluated":
        selected = evaluation["selected_model"]

        if selected == "linear_regression":
            model = fit_linear_regression(data)
            predicted = regression_predict(model, future_time)
        else:
            predicted = current_temperature

        base_error = evaluation["holdout_rmse"]

    else:
        selected = "persistence"
        predicted = current_temperature

        values = [value for _, value in data]
        base_error = (
            stdev(values) if len(values) >= 2 else 0.0
        )

    # Widen uncertainty as the forecast moves further
    # beyond the observed historical time span.
    expansion = math.sqrt(
        1 + hours / max(duration_hours, 0.01)
    )

    uncertainty = max(0.05, base_error * expansion)

    lower = predicted - 1.96 * uncertainty
    upper = predicted + 1.96 * uncertainty

    if len(data) < 20:
        quality = "insufficient_data"
    elif duration_hours < hours:
        quality = "insufficient_historical_coverage"
    else:
        quality = "experimental"

    return {
        "status": "prediction_generated",
        "parameter": "water_temperature",
        "current_temperature_c": round(current_temperature, 3),
        "predicted_temperature_c": round(predicted, 3),
        "horizon": label,
        "horizon_hours": hours,
        "prediction_timestamp": future_time.isoformat(),
        "model_name": selected,
        "evaluation_metrics": evaluation,
        "uncertainty": {
            "lower_c": round(lower, 3),
            "upper_c": round(upper, 3),
            "method": "Approximate 95% interval based on holdout RMSE",
        },
        "data_quality": {
            "status": quality,
            "valid_readings": len(data),
            "historical_coverage_hours": round(duration_hours, 3),
        },
        "experimental": True,
        "scientific_note": (
            "Experimental statistical forecast, not a scientifically "
            "validated ocean forecast. Long-range predictions require "
            "substantially more historical data and validation."
        ),
    }


def get_model_performance():
    """Return model comparison and evaluation results."""

    data = load_temperature_data()
    result = evaluate_models(data)

    result["valid_readings"] = len(data)

    if len(data) >= 2:
        result["historical_coverage_hours"] = round(
            (data[-1][0] - data[0][0]).total_seconds() / 3600,
            3,
        )
    else:
        result["historical_coverage_hours"] = 0

    result["evaluation_method"] = (
        "Chronological 80/20 train/test split"
    )

    return result
