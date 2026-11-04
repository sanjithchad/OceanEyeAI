from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator


class TelemetryIn(BaseModel):
    """One observation reported by a registered/connected monitoring device."""
    model_config = ConfigDict(extra="forbid")

    sensor_id: str = Field(min_length=1, max_length=80)
    temperature_c: float | None = Field(default=None, ge=-5, le=60)
    turbidity_ntu: float | None = Field(default=None, ge=0, le=5000)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    observed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source: Literal["hardware", "manual_test"] = "hardware"

    @model_validator(mode="after")
    def require_measurement(self):
        if all(value is None for value in (
            self.temperature_c, self.turbidity_ntu, self.latitude, self.longitude
        )):
            raise ValueError("Provide at least one measurement or GPS coordinate.")
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together.")
        return self
