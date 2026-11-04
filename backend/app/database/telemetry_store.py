import os
import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(os.getenv("OCEAN_EYE_DB_PATH", Path(__file__).resolve().parents[2] / "ocean_eye.db"))


def _connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    with _connect() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS telemetry (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT NOT NULL,
                temperature_c REAL,
                turbidity_ntu REAL,
                latitude REAL,
                longitude REAL,
                observed_at TEXT NOT NULL,
                received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
                source TEXT NOT NULL CHECK(source IN ('hardware', 'manual_test'))
            )
        """)
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_telemetry_sensor_time "
            "ON telemetry(sensor_id, observed_at DESC)"
        )


def insert_reading(payload: dict[str, Any]) -> dict[str, Any]:
    initialize_database()
    with _connect() as connection:
        cursor = connection.execute("""
            INSERT INTO telemetry
            (sensor_id, temperature_c, turbidity_ntu, latitude, longitude, observed_at, source)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            payload["sensor_id"], payload.get("temperature_c"),
            payload.get("turbidity_ntu"), payload.get("latitude"),
            payload.get("longitude"), payload["observed_at"], payload["source"]
        ))
        row = connection.execute(
            "SELECT * FROM telemetry WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
        return dict(row)


def get_latest_readings(limit: int = 50) -> list[dict[str, Any]]:
    initialize_database()
    with _connect() as connection:
        rows = connection.execute("""
            SELECT t.* FROM telemetry t
            INNER JOIN (
                SELECT sensor_id, MAX(id) AS latest_id
                FROM telemetry GROUP BY sensor_id
            ) latest ON latest.latest_id = t.id
            ORDER BY t.id DESC
            LIMIT ?
        """, (limit,)).fetchall()
        return [dict(row) for row in rows]


def get_recent_readings(sensor_id: str, limit: int = 100) -> list[dict[str, Any]]:
    initialize_database()
    with _connect() as connection:
        rows = connection.execute("""
            SELECT * FROM telemetry WHERE sensor_id = ?
            ORDER BY observed_at DESC, id DESC LIMIT ?
        """, (sensor_id, limit)).fetchall()
        return [dict(row) for row in rows]
