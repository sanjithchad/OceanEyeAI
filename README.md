# OCEAN EYE AI — Phase 1: Project Foundation

A separate React/Vite frontend and FastAPI backend. The dashboard checks the backend health endpoint on load and every 30 seconds.

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer (Node.js 20 LTS recommended)
- npm (included with Node.js)

Check installations:

```bash
python --version
node --version
npm --version
```

On Windows, `py --version` can be used if `python` is not on PATH.

## 1. Start the backend

Open a terminal in the project root, then:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

**Windows PowerShell**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows Command Prompt**
```bat
.venv\Scripts\activate.bat
```

**macOS/Linux**
```bash
source .venv/bin/activate
```

Install backend dependencies:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Run FastAPI:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Keep this terminal open. The API is now available at:

- Root: http://127.0.0.1:8000/
- Health: http://127.0.0.1:8000/api/health
- Interactive API docs: http://127.0.0.1:8000/docs

Expected health response includes `"status": "healthy"`.

## 2. Start the frontend

Open a **second terminal** in the project root:

```bash
cd frontend
npm install
```

Create your local environment file (optional; the default is already correct):

**Windows PowerShell**
```powershell
Copy-Item .env.example .env
```

**Windows Command Prompt**
```bat
copy .env.example .env
```

**macOS/Linux**
```bash
cp .env.example .env
```

Start Vite:

```bash
npm run dev
```

Open the URL printed by Vite, normally http://127.0.0.1:5173.

## 3. Verify the connection

1. Confirm the backend terminal says it is running on `http://127.0.0.1:8000`.
2. Open `http://127.0.0.1:8000/api/health` and confirm the JSON response has `"status": "healthy"`.
3. Open `http://127.0.0.1:5173`.
4. The dashboard should show **Backend connected**. It retries automatically every 30 seconds; use the refresh icon for an immediate check.
5. Stop the backend with `Ctrl+C`: the dashboard should switch to **Backend disconnected**. Restart it and retry.

## Installation commands explained

- `python -m venv .venv`: creates an isolated Python environment for this project.
- Activation: makes commands in that terminal use the project's isolated Python packages.
- `python -m pip install --upgrade pip`: updates the package installer inside that environment.
- `pip install -r requirements.txt`: installs FastAPI and Uvicorn from the dependency list.
- `uvicorn ... --reload`: runs the API and reloads it when backend source files change. `--host 127.0.0.1` keeps it local to your machine.
- `npm install`: downloads the frontend packages listed in `package.json`.
- `npm run dev`: starts Vite's local development server with hot reload.

## Common issues

- **`python` not found on Windows:** try `py` in place of `python` (for example `py -m venv .venv`).
- **PowerShell blocks activation:** use Command Prompt activation, or adjust the execution policy for the current user according to your organization's security policy. You can also run `.venv\Scripts\python.exe -m pip install -r requirements.txt` without activation.
- **`uvicorn` not found:** ensure the virtual environment is activated and rerun `pip install -r requirements.txt`.
- **Frontend says disconnected:** ensure both servers are running. Check `VITE_API_BASE_URL` in `frontend/.env`; it should be `http://127.0.0.1:8000`. Restart Vite after changing `.env`.
- **CORS error:** use the frontend URL `http://127.0.0.1:5173` or `http://localhost:5173`. If you change the Vite port/origin, add that exact origin to `allow_origins` in `backend/app/main.py`, then restart FastAPI.

## Project structure

```text
OceanEyeAI/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── health.py
│   │   ├── services/
│   │   │   └── __init__.py
│   │   ├── models/
│   │   │   └── __init__.py
│   │   └── database/
│   │       └── __init__.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/ConnectionStatus.jsx
│   │   ├── pages/Dashboard.jsx
│   │   ├── services/api.js
│   │   ├── styles/global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
├── docs/architecture.md
└── README.md
```

## Phase 1 completion criteria

- [ ] FastAPI starts without errors.
- [ ] `/` returns the API welcome JSON.
- [ ] `/api/health` returns `status: healthy`.
- [ ] Vite starts and the dashboard loads.
- [ ] Dashboard reports **Backend connected**.
- [ ] Stopping FastAPI changes the dashboard status to disconnected.

**Phase 1 is complete only after these checks pass on your machine.** SQLite and live ocean data integrations are deliberately deferred to later phases.


## Phase 2 — Futuristic dashboard UI

The frontend now includes a responsive marine intelligence dashboard, reusable metric/chart/navigation components, functional section navigation, and a FastAPI health connection indicator. All ocean readings and trend lines are explicitly labelled as illustrative demonstration data. GPS and sensor network values remain unavailable until real hardware/data integrations are added. The Phase 1 FastAPI backend and its routes are preserved unchanged.

Run the backend and frontend using the Phase 1 commands above. From `frontend`, run `npm install`, then `npm run dev`. To validate the production bundle, run `npm run build`.


## Phase 3 — Sensor integration foundation

Phase 3 begins with a generic FastAPI telemetry contract and SQLite persistence. See `docs/phase3-telemetry.md` for endpoints and a clearly labelled `manual_test` request. This does not claim physical sensors are connected; real hardware integration and dashboard live-data wiring remain pending confirmation of the user's sensor/controller models.

## Phase 3 — Simulated Ocean Monitoring Unit

The project now includes an automatic in-memory ocean sensor simulator, sensor API endpoints, abnormal/failure controls and a React dashboard polling integration. All values are explicitly labelled `SIMULATED`. Follow `docs/phase3-simulator.md` for Windows startup, configuration, endpoints and verification.


## Phase 4 — Persistent database

Phase 4 adds SQLAlchemy-backed SQLite storage. See [docs/phase4-database.md](docs/phase4-database.md) for schema, endpoints, setup, and persistence tests. Existing Phase 3 simulator and frontend files/routes are retained.
