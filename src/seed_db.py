from datetime import datetime, timezone

from db import init_db, insert_alert, insert_event


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def seed() -> None:
    init_db()
    e1 = {
        "timestamp_utc": now(),
        "event_type": "created",
        "source_path": "C:\\demo\\sensitive_data\\salary_data.xlsx",
        "destination_path": None,
        "user": "demo_user",
        "host": "demo_host",
        "process_name": "python.exe",
        "hash_algorithm": "sha256",
        "source_hash": "demo_hash_1",
        "destination_hash": None,
        "violations": [],
    }
    e2 = {
        "timestamp_utc": now(),
        "event_type": "moved",
        "source_path": "C:\\demo\\sensitive_data\\salary_data.xlsx",
        "destination_path": "C:\\demo\\onedrive\\salary_data.xlsx",
        "user": "demo_user",
        "host": "demo_host",
        "process_name": "python.exe",
        "hash_algorithm": "sha256",
        "source_hash": "demo_hash_1",
        "destination_hash": "demo_hash_1",
        "violations": ["Sensitive file moved to suspicious destination"],
    }
    insert_event(e1)
    insert_event(e2)
    insert_alert(
        {
            "timestamp_utc": now(),
            "severity": "high",
            "message": "Policy violation detected",
            "violations": ["Sensitive file moved to suspicious destination"],
            "event": e2,
        }
    )
    print("Seeded demo events and alerts into database.")


if __name__ == "__main__":
    seed()
