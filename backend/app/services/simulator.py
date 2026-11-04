"""Deterministic-in-shape, stochastic-in-detail ocean monitoring simulator.

The service is deliberately isolated from the HTTP routes so an ESP32 adapter can
publish the same reading schema later without changing dashboard consumers.
"""
from __future__ import annotations

import asyncio
import math
import os
import random
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


class SimulationConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    interval_seconds: int = Field(default=5, ge=1, le=3600)
    latitude: float = Field(default=13.0827, ge=-90, le=90)
    longitude: float = Field(default=80.2707, ge=-180, le=180)
    device_id: str = Field(default="OE-SIM-001", min_length=2, max_length=64)
    device_name: str = Field(default="Ocean Monitoring Unit 01", max_length=100)


class OceanSensorSimulator:
    def __init__(self) -> None:
        self.config = SimulationConfig(
            interval_seconds=int(_env_float("OCEAN_SIM_INTERVAL_SECONDS", 5)),
            latitude=_env_float("OCEAN_SIM_LATITUDE", 13.0827),
            longitude=_env_float("OCEAN_SIM_LONGITUDE", 80.2707),
            device_id=os.getenv("OCEAN_SIM_DEVICE_ID", "OE-SIM-001"),
            device_name=os.getenv("OCEAN_SIM_DEVICE_NAME", "Ocean Monitoring Unit 01"),
        )
        self._history: deque[dict[str, Any]] = deque(maxlen=1200)
        self._lock = asyncio.Lock()
        self._task: asyncio.Task | None = None
        self._temperature = 27.1
        self._turbidity = 3.6
        self._battery = 100.0
        self._lat = self.config.latitude
        self._lon = self.config.longitude
        self._failure_mode = False
        self._abnormal_next = False
        self._last_update: str | None = None
        self._started_at: str | None = None

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._started_at = datetime.now(timezone.utc).isoformat()
        self._task = asyncio.create_task(self._run(), name="ocean-sensor-simulator")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def _run(self) -> None:
        # Emit immediately, then at the configured interval.
        while True:
            await self.generate_reading()
            await asyncio.sleep(self.config.interval_seconds)

    async def generate_reading(self, force_abnormal: bool = False) -> dict[str, Any]:
        async with self._lock:
            now = datetime.now(timezone.utc)
            # Slowly varying baseline + small correlated random movement.
            minute_wave = math.sin(now.timestamp() / 1800) * 0.12
            self._temperature += random.uniform(-0.045, 0.045) + minute_wave * 0.025
            self._temperature = min(31.5, max(22.0, self._temperature))

            # Turbidity usually changes gently, with infrequent natural-looking pulses.
            self._turbidity += random.uniform(-0.22, 0.22)
            if random.random() < 0.035:
                self._turbidity += random.uniform(0.8, 2.6)
            self._turbidity = min(18.0, max(0.4, self._turbidity))

            # Small GPS drift around the configured demonstration position.
            self._lat = self.config.latitude + random.uniform(-0.0015, 0.0015)
            self._lon = self.config.longitude + random.uniform(-0.0015, 0.0015)
            self._battery = max(5.0, self._battery - random.uniform(0.0002, 0.0012))

            abnormal = force_abnormal or self._abnormal_next
            self._abnormal_next = False
            temperature = round(self._temperature, 2)
            turbidity = round(self._turbidity, 2)
            sensor_status = "online"
            alerts: list[str] = []
            if abnormal:
                temperature = round(random.choice([random.uniform(34, 38), random.uniform(15, 18)]), 2)
                turbidity = round(random.uniform(35, 65), 2)
                sensor_status = "abnormal"
                alerts = ["SIMULATED_HIGH_TURBIDITY", "SIMULATED_TEMPERATURE_ANOMALY"]
            if self._failure_mode:
                sensor_status = "offline"
                alerts = ["SIMULATED_SENSOR_DISCONNECTION"]
                temperature_value = None
                turbidity_value = None
            else:
                temperature_value = temperature
                turbidity_value = turbidity

            reading = {
                "id": str(uuid.uuid4()),
                "temperature": temperature_value,
                "turbidity": turbidity_value,
                "latitude": round(self._lat, 6),
                "longitude": round(self._lon, 6),
                "timestamp": now.isoformat(),
                "device_id": self.config.device_id,
                "sensor_status": sensor_status,
                "battery_level": round(self._battery, 1),
                "connection_status": "disconnected" if self._failure_mode else "connected",
                "data_mode": "SIMULATED",
                "alerts": alerts,
            }
            self._history.appendleft(reading)
            self._last_update = reading["timestamp"]
            # Persist each generated observation; failures are logged without killing simulation.
            try:
                from app.services.persistence import save_simulated_reading
                await asyncio.to_thread(save_simulated_reading, reading, self.config.device_name)
            except Exception:
                import logging
                logging.exception("Could not persist simulated sensor reading")
            return reading.copy()

    async def latest(self) -> dict[str, Any] | None:
        async with self._lock:
            return self._history[0].copy() if self._history else None

    async def history(self, limit: int = 100) -> list[dict[str, Any]]:
        async with self._lock:
            return [item.copy() for item in list(self._history)[:limit]]

    async def status(self) -> dict[str, Any]:
        latest = await self.latest()
        running = bool(self._task and not self._task.done())
        return {
            "simulator_running": running,
            "sensor_status": "offline" if self._failure_mode else (latest["sensor_status"] if latest else "starting"),
            "connection_status": "disconnected" if self._failure_mode else "connected",
            "failure_mode": self._failure_mode,
            "abnormal_next_reading_armed": self._abnormal_next,
            "interval_seconds": self.config.interval_seconds,
            "history_count": len(self._history),
            "last_update": self._last_update,
            "data_mode": "SIMULATED",
        }

    async def device(self) -> dict[str, Any]:
        latest = await self.latest()
        return {
            "device_id": self.config.device_id,
            "device_name": self.config.device_name,
            "battery_level": latest["battery_level"] if latest else self._battery,
            "connection_status": "disconnected" if self._failure_mode else "connected",
            "sensor_status": "offline" if self._failure_mode else (latest["sensor_status"] if latest else "starting"),
            "last_update": self._last_update,
            "data_mode": "SIMULATED",
            "location": {"latitude": self.config.latitude, "longitude": self.config.longitude},
        }

    async def arm_abnormal(self) -> dict[str, Any]:
        reading = await self.generate_reading(force_abnormal=True)
        return {"accepted": True, "message": "An abnormal reading was generated immediately.", "reading": reading}

    async def set_failure(self, disconnected: bool) -> dict[str, Any]:
        async with self._lock:
            self._failure_mode = disconnected
        # Create a fresh reading immediately so latest/status reflect the control action.
        reading = await self.generate_reading()
        return {
            "accepted": True,
            "failure_mode": self._failure_mode,
            "connection_status": "disconnected" if disconnected else "connected",
            "message": "Simulated sensor disconnection enabled." if disconnected else "Simulated sensor connection restored.",
            "reading": reading,
        }


simulator = OceanSensorSimulator()
