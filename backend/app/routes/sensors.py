from fastapi import APIRouter, HTTPException, Query
from app.services.simulator import simulator

router = APIRouter(prefix="/sensors", tags=["simulated sensors"])


@router.get("/latest")
async def latest_sensor_reading():
    reading = await simulator.latest()
    if reading is None:
        raise HTTPException(status_code=503, detail="Simulator has not generated its first reading yet.")
    return reading


@router.get("/history")
async def sensor_history(limit: int = Query(default=100, ge=1, le=1200)):
    items = await simulator.history(limit)
    return {"items": items, "count": len(items), "data_mode": "SIMULATED"}


@router.get("/status")
async def sensor_status():
    return await simulator.status()


@router.get("/device")
async def sensor_device():
    return await simulator.device()


@router.post("/simulate/abnormal")
async def simulate_abnormal_reading():
    return await simulator.arm_abnormal()


@router.post("/simulate/failure")
async def simulate_sensor_failure(disconnected: bool = Query(default=True)):
    return await simulator.set_failure(disconnected)
