"""Pydantic response schemas for persistent database records."""
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, field_validator


def normalize_utc(value):
    """SQLite drops timezone metadata; expose stored UTC values as aware datetimes."""
    if value is None:
        return None
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


class ReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    device_id: str
    temperature: float | None
    turbidity: float | None
    latitude: float
    longitude: float
    timestamp: datetime

    @field_validator("timestamp", mode="before")
    @classmethod
    def timestamp_is_utc(cls, value):
        return normalize_utc(value)


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    device_name: str
    device_status: str
    battery_level: float
    last_seen: datetime | None

    @field_validator("last_seen", mode="before")
    @classmethod
    def last_seen_is_utc(cls, value):
        return normalize_utc(value)


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    alert_type: str
    severity: str
    description: str
    timestamp: datetime
    resolved: bool

    @field_validator("timestamp", mode="before")
    @classmethod
    def timestamp_is_utc(cls, value):
        return normalize_utc(value)


class PredictionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    prediction_type: str
    predicted_value: str
    prediction_time: datetime
    confidence: float
    created_at: datetime

    @field_validator("prediction_time", "created_at", mode="before")
    @classmethod
    def timestamps_are_utc(cls, value):
        return normalize_utc(value)
