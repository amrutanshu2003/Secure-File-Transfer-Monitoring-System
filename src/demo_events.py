import shutil
import time
from pathlib import Path


def run_demo() -> None:
    base = Path(".").resolve()
    sensitive = base / "sensitive_data"
    normal = base / "demo_normal"
    suspicious = base / "demo_onedrive_sync"

    sensitive.mkdir(parents=True, exist_ok=True)
    normal.mkdir(parents=True, exist_ok=True)
    suspicious.mkdir(parents=True, exist_ok=True)

    file_a = sensitive / "salary_data.xlsx"
    file_a.write_text("confidential payroll data", encoding="utf-8")
    time.sleep(1)

    file_b = normal / "notes.txt"
    file_b.write_text("normal text file", encoding="utf-8")
    time.sleep(1)

    moved = suspicious / "salary_data.xlsx"
    shutil.copy2(file_a, moved)
    time.sleep(1)

    file_b.write_text("normal text file updated", encoding="utf-8")
    time.sleep(1)

    moved.unlink(missing_ok=True)
    time.sleep(1)

    print("Demo events generated successfully.")


if __name__ == "__main__":
    run_demo()
