# Phase 3 — Ocean Monitoring Unit simulator

## Included

- Background simulator starts with FastAPI and emits an observation immediately, then at a configurable interval (default: 5 seconds).
- Smooth random-walk temperature, gentle turbidity movement with occasional pulses, and small GPS drift around a configurable demonstration location.
- Device ID/name, battery estimate, connection status, UTC timestamp, unique reading ID and sensor status.
- In-memory history (last 1,200 records); data resets when the backend restarts.
- Immediate abnormal-reading and disconnect/restore controls for QA.
- React dashboard polls the API every 3 seconds and labels every reading **SIMULATED**.
- Simulator service is separate from HTTP routes; a future ESP32 adapter can publish the same reading schema.

## Start the project on Windows

### 1. Backend terminal

```powershell
cd "C:\Users\USER\OneDrive\Attachments\Desktop\Sanjith\OceanEyeAI\backend"
# Activate the environment if it is not already active:
.\.venv\Scripts\Activate.ps1
# If PowerShell blocks activation, use Command Prompt or run the venv Python directly.
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

### 2. Frontend terminal

```powershell
cd "C:\Users\USER\OneDrive\Attachments\Desktop\Sanjith\OceanEyeAI\frontend"
npm install
npm run dev
```

Open `http://localhost:5173`. OpenAPI docs: `http://127.0.0.1:8000/docs`.

## Configuration

Copy `backend/.env.example` to `backend/.env` and set values before launching the backend. The example values target a Chennai demonstration coordinate only; change them to another demo point as needed.

| Variable | Default | Meaning |
|---|---:|---|
| `OCEAN_SIM_INTERVAL_SECONDS` | `5` | Simulator generation interval; 1–3600 seconds |
| `OCEAN_SIM_LATITUDE` | `13.0827` | Centre latitude for demo GPS drift |
| `OCEAN_SIM_LONGITUDE` | `80.2707` | Centre longitude for demo GPS drift |
| `OCEAN_SIM_DEVICE_ID` | `OE-SIM-001` | Simulated unit ID |
| `OCEAN_SIM_DEVICE_NAME` | `Ocean Monitoring Unit 01` | Display name |

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/sensors/latest` | Most recent generated reading |
| GET | `/api/sensors/history?limit=100` | Recent in-memory readings (max 1,200) |
| GET | `/api/sensors/status` | Simulator, sensor and connection state |
| GET | `/api/sensors/device` | Device identity, battery and configured location |
| POST | `/api/sensors/simulate/abnormal` | Immediately create an abnormal test reading |
| POST | `/api/sensors/simulate/failure?disconnected=true` | Simulate sensor disconnection |
| POST | `/api/sensors/simulate/failure?disconnected=false` | Restore simulated connection |

Every reading contains `id`, `temperature`, `turbidity`, `latitude`, `longitude`, `timestamp`, `device_id`, `sensor_status`, `battery_level`, `connection_status`, `data_mode` and `alerts`. During disconnection, temperature and turbidity are `null`, and status is `offline`.

## Test the simulator with PowerShell

```powershell
Invoke-RestMethod "http://127.0.0.1:8000/api/sensors/latest"
Invoke-RestMethod "http://127.0.0.1:8000/api/sensors/history?limit=10"
Invoke-RestMethod "http://127.0.0.1:8000/api/sensors/status"
Invoke-RestMethod "http://127.0.0.1:8000/api/sensors/device"

# Create an abnormal reading immediately
Invoke-RestMethod -Method Post "http://127.0.0.1:8000/api/sensors/simulate/abnormal"

# Disconnect, verify latest/status, then restore
Invoke-RestMethod -Method Post "http://127.0.0.1:8000/api/sensors/simulate/failure?disconnected=true"
Invoke-RestMethod "http://127.0.0.1:8000/api/sensors/latest"
Invoke-RestMethod -Method Post "http://127.0.0.1:8000/api/sensors/simulate/failure?disconnected=false"
```

## Test checklist

1. Start backend and verify `/api/sensors/latest` returns a timestamped `SIMULATED` reading.
2. Wait at least one generation interval (default 5 seconds); confirm timestamp/history count changes.
3. Confirm history endpoint returns multiple records.
4. Confirm coordinates stay close to configured demonstration coordinates.
5. Trigger abnormal reading; verify `sensor_status: abnormal` and alert codes.
6. Enable failure; verify `offline`, `disconnected`, and null temperature/turbidity.
7. Restore connection; verify next reading returns to `online`.
8. Open dashboard; verify values update without refreshing the page and all metrics say `SIMULATED`.

## Important

This is a simulation, not ocean telemetry. Do not use generated values for scientific, safety, regulatory or operational decisions. The in-memory history is intentionally temporary. Physical sensor integration, calibration and validation are separate future work.
