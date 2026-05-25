import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List


DB_PATH = Path("data/monitor.db")


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS file_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp_utc TEXT NOT NULL,
                event_type TEXT,
                source_path TEXT,
                destination_path TEXT,
                username TEXT,
                host TEXT,
                process_name TEXT,
                hash_algorithm TEXT,
                source_hash TEXT,
                destination_hash TEXT,
                violations_json TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp_utc TEXT NOT NULL,
                severity TEXT,
                message TEXT,
                violations_json TEXT,
                event_json TEXT
            )
            """
        )


def insert_event(event_payload: Dict[str, Any]) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO file_events (
                timestamp_utc, event_type, source_path, destination_path, username, host,
                process_name, hash_algorithm, source_hash, destination_hash, violations_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_payload.get("timestamp_utc"),
                event_payload.get("event_type"),
                event_payload.get("source_path"),
                event_payload.get("destination_path"),
                event_payload.get("user"),
                event_payload.get("host"),
                event_payload.get("process_name"),
                event_payload.get("hash_algorithm"),
                event_payload.get("source_hash"),
                event_payload.get("destination_hash"),
                json.dumps(event_payload.get("violations", []), ensure_ascii=True),
            ),
        )
        return int(cur.lastrowid)


def insert_alert(alert_payload: Dict[str, Any]) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO alerts (
                timestamp_utc, severity, message, violations_json, event_json
            ) VALUES (?, ?, ?, ?, ?)
            """,
            (
                alert_payload.get("timestamp_utc"),
                alert_payload.get("severity"),
                alert_payload.get("message"),
                json.dumps(alert_payload.get("violations", []), ensure_ascii=True),
                json.dumps(alert_payload.get("event", {}), ensure_ascii=True),
            ),
        )
        return int(cur.lastrowid)


def fetch_recent_events(limit: int = 100) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM file_events ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def fetch_recent_alerts(limit: int = 100) -> List[Dict[str, Any]]:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(row) for row in rows]


def build_summary() -> Dict[str, Any]:
    with get_conn() as conn:
        total_events = conn.execute("SELECT COUNT(*) AS c FROM file_events").fetchone()["c"]
        total_alerts = conn.execute("SELECT COUNT(*) AS c FROM alerts").fetchone()["c"]

        rows = conn.execute(
            "SELECT event_type, COUNT(*) AS c FROM file_events GROUP BY event_type ORDER BY c DESC"
        ).fetchall()
        event_counts = {row["event_type"] or "unknown": row["c"] for row in rows}

        alert_rows = conn.execute("SELECT violations_json FROM alerts").fetchall()

    violation_counts: Dict[str, int] = {}
    for row in alert_rows:
        for violation in json.loads(row["violations_json"] or "[]"):
            violation_counts[violation] = violation_counts.get(violation, 0) + 1

    return {
        "total_events": total_events,
        "total_alerts": total_alerts,
        "event_type_counts": event_counts,
        "top_violation_types": violation_counts,
    }


def clear_all_data() -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM alerts")
        conn.execute("DELETE FROM file_events")
