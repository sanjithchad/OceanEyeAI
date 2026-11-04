
"""Temperature prediction API routes."""

from fastapi import APIRouter

from ai_engine.forecast import (
    generate_prediction,
    get_model_performance,
)

router = APIRouter(
    prefix="/predictions",
    tags=["Temperature Predictions"],
)


@router.get("/temperature")
def temperature():
    return {
        "predictions": {
            horizon: generate_prediction(horizon)
            for horizon in [
                "1hour",
                "6hours",
                "24hours",
                "3days",
                "7days",
            ]
        }
    }


@router.get("/1hour")
def one_hour():
    return generate_prediction("1hour")


@router.get("/6hours")
def six_hours():
    return generate_prediction("6hours")


@router.get("/24hours")
def twenty_four_hours():
    return generate_prediction("24hours")


@router.get("/3days")
def three_days():
    return generate_prediction("3days")


@router.get("/7days")
def seven_days():
    return generate_prediction("7days")


@router.get("/performance")
def performance():
    return get_model_performance()
