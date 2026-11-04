from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.routes import health, telemetry, sensors, database, ai, predictions, risk, chat
from app.database.sqlalchemy_db import initialize_database
from app.services.simulator import simulator

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    await simulator.start()
    yield
    await simulator.stop()

app = FastAPI(
    title="Ocean Eye AI API",
    description="Backend API for the Ocean Eye AI ocean monitoring platform.",
    version="0.4.0",
    lifespan=lifespan,
)

# Vite's local development origin. Add deployed frontend origins via env/config later.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(telemetry.router, prefix="/api")
app.include_router(sensors.router, prefix="/api")
app.include_router(database.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(predictions.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

@app.get("/", tags=["root"])
async def root():
    return {
        "name": "Ocean Eye AI",
        "message": "Ocean Eye AI API is running.",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/status", tags=["status"])
async def status():
    return JSONResponse(
        status_code=200,
        content={"status": "online", "service": "ocean-eye-ai-api"},
    )
