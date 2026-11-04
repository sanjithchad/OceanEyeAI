# Ocean Eye AI — Phase 4 Database

## Storage

The backend uses SQLite through SQLAlchemy 2.x. By default the file is `backend/ocean_eye.db` (created automatically). Set `OCEAN_EYE_DB_PATH` to use another absolute or relative path. Existing Phase 3 routes and the separate legacy `telemetry` table are preserved.

## Tables

| Table | Purpose | Important columns |
|---|---|---|
| `sensor_readings` | Immutable sensor history | `id`, `device_id`, `temperature`, `turbidity`, `latitude`, `longitude`, `timestamp` |
| `devices` | Device registry and heartbeat | `id`, `device_name`, `device_status`, `battery_level`, `last_seen` |
| `alerts` | Simulator-generated alert events | `id`, `alert_type`, `severity`, `description`, `timestamp`, `resolved` |
| `predictions` | Persisted model predictions | `id`, `prediction_type`, `predicted_value`, `prediction_time`, `confidence`, `created_at` |
| `ai_analysis` | Persisted AI analysis results | `id`, `analysis_type`, `result`, `severity`, `created_at` |

`devices.id` is the simulator device identifier. `sensor_readings.device_id` references it. All timestamps are generated in UTC and serialized by FastAPI as ISO-8601. SQLite stores timezone-naive datetime values internally; the persistence adapter normalizes incoming timestamps to UTC and Pydantic response schemas restore UTC timezone information in API responses.

## Automatic behavior

On startup, SQLAlchemy creates missing tables. The simulator continues to emit immediately and every configured interval (5 seconds by default). Each emitted reading is appended to `sensor_readings`; device status, battery, and `last_seen` are upserted; generated simulator alerts are appended to `alerts`. Database writes run in a worker thread so synchronous SQLite operations do not block the event loop. A persistence error is logged and does not terminate the simulator.

## API

- `GET /api/database/status` — connection and row counts
- `GET /api/readings?limit=100&device_id=OE-SIM-001&start_date=2026-11-03T00:00:00Z&end_date=2026-11-04T00:00:00Z`
- `GET /api/readings/latest`
- `GET /api/readings/history?start_date=...&end_date=...&limit=500`
- `GET /api/devices` and `GET /api/devices/{device_id}`
- `GET /api/alerts?limit=100&unresolved_only=true`
- `GET /api/predictions?limit=100`

Date filters accept ISO-8601 timestamps. `start_date` must not be later than `end_date`. Limits are validated and invalid requests return HTTP 422. Empty latest-reading and unknown-device lookups return HTTP 404.

## Install and run (Windows PowerShell)

```powershell
cd .\backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`. The existing dashboard and Phase 3 `/api/sensors/*` routes remain available. The new persistent history routes are `/api/readings*`.

## Verify persistence

1. Start the backend and wait 15 seconds.
2. Open `/api/database/status`; `sensor_readings` should increase and `devices` should be at least 1.
3. Open `/api/readings/latest` and note the returned timestamp.
4. Stop the backend with Ctrl+C, restart it, and open `/api/readings/latest` again. Older records remain, and new records continue to append.
5. Test `GET /api/readings?start_date=not-a-date` (expect 422) and `GET /api/readings/latest` (expect 200 after the simulator emits).
6. Trigger `POST /api/sensors/simulate/abnormal` in `/docs`; check `/api/alerts` for generated alerts.

Predictions and AI analysis tables are created and queryable. The persistence adapter exposes `save_prediction(...)`, `save_ai_analysis(...)`, and `save_alert(...)` for the prediction and AI engines to call. No predictions are fabricated before those engines exist.

## Integrity and timestamp handling

SQLite foreign-key enforcement is enabled for every SQLAlchemy connection. API timestamps are returned with an explicit UTC offset (`+00:00`), even though SQLite does not retain timezone metadata in its native datetime storage.

## Backup

Stop the backend before copying `backend/ocean_eye.db`. Do not delete this file when updating application code; it contains persistent project data.


## Validation performed during package preparation

- FastAPI application startup initialized all five SQLAlchemy tables.
- Simulator inserted a reading immediately and another on its next interval.
- A second application startup using the same SQLite file retained prior rows and continued appending.
- `/api/database/status`, `/api/readings`, `/api/readings/latest`, `/api/readings/history`, `/api/devices`, `/api/alerts`, and `/api/predictions` returned successfully.
- Invalid limits, malformed ISO-8601 dates, and reversed date ranges returned HTTP 422.
- Triggering the abnormal simulator control created persistent alert rows.

These checks were run against an isolated temporary database; your local `ocean_eye.db` will be created on the first startup.
