# Phase 3 — Sensor integration foundation

## What is implemented

- A generic, validated telemetry payload for temperature, turbidity and GPS.
- SQLite storage using Python's standard library (no additional database dependency).
- `POST /api/telemetry` for incoming observations.
- `GET /api/telemetry/latest` for the latest observation per sensor.
- `GET /api/telemetry/{sensor_id}/history` for recent sensor history.
- Each record is labelled `hardware` or `manual_test`; manual test data is never silently represented as hardware data.
- Invalid ranges, unknown fields, and incomplete GPS coordinate pairs are rejected.

## Important current limitation

This is the backend integration foundation, not a completed hardware connection. No physical sensor is connected by this change. The dashboard must continue to label existing sample charts as demonstration data until a real device sends observations and the frontend is updated to consume the telemetry API.

## Run locally

From `backend` with the project's virtual environment active:

```powershell
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`. The new **telemetry** API group should be visible.

## Safe manual API test

Use this only to verify storage. It creates a record explicitly labelled `manual_test`, not live hardware data.

```powershell
$body = @{
  sensor_id = "demo-sensor-01"
  temperature_c = 26.4
  turbidity_ntu = 3.8
  latitude = 13.0827
  longitude = 80.2707
  source = "manual_test"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/telemetry" `
  -ContentType "application/json" -Body $body
```

Then query:

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/api/telemetry/latest"
```

## Before wiring physical hardware

Confirm the sensor/controller model and connection method. Examples include ESP32 over Wi-Fi/HTTP, Arduino via USB serial, or Raspberry Pi. Also confirm the exact temperature and turbidity sensor models, voltage/interface, and whether GPS is present. Do not connect unknown-voltage hardware directly to a computer or microcontroller.
