# Phase 1 architecture

- `frontend/`: Vite + React single-page dashboard. The API base URL is configurable with `VITE_API_BASE_URL`.
- `backend/`: FastAPI application. `app/main.py` configures CORS and mounts API routes.
- `backend/app/routes/health.py`: lightweight health check with UTC timestamp.
- `backend/app/services/`, `models/`, and `database/`: reserved modular boundaries for later phases.

The SQLite integration is intentionally not initialized in Phase 1; the directory is prepared for it without adding an unused database dependency.
