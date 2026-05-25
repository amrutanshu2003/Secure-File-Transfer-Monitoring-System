import argparse
import getpass
import hashlib
import json
import os
import socket
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import psutil  # type: ignore
except Exception:
    psutil = None

try:
    from watchdog.events import FileSystemEvent, FileSystemEventHandler  # type: ignore
except Exception:
    FileSystemEvent = Any

    class FileSystemEventHandler:  # type: ignore
        pass

from db import build_summary, init_db, insert_alert, insert_event


DEFAULT_CONFIG = "config/policy.json"
REPORT_FILE = Path("logs/audit_report.json")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_policy(config_path: str) -> Dict[str, Any]:
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_path(path: str) -> str:
    return str(Path(path).resolve()).lower()


def safe_hash(path: str, algorithm: str = "sha256") -> Optional[str]:
    try:
        hasher = hashlib.new(algorithm)
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception:
        return None


def guess_process_name() -> Optional[str]:
    try:
        if psutil is None:
            return None
        return psutil.Process(os.getpid()).name()
    except Exception:
        return None


class SecureTransferMonitor(FileSystemEventHandler):
    def __init__(self, policy: Dict[str, Any]) -> None:
        self.sensitive_paths = [normalize_path(p) for p in policy.get("sensitive_paths", [])]
        self.restricted_extensions = {ext.lower() for ext in policy.get("restricted_extensions", [])}
        self.restricted_users = {u.lower() for u in policy.get("restricted_users", [])}
        self.suspicious_keywords = [k.lower() for k in policy.get("suspicious_destination_keywords", [])]
        self.hash_algorithm = policy.get("hash_algorithm", "sha256")
        self.ignored_paths = [normalize_path("data"), normalize_path("logs"), normalize_path("__pycache__")]

    def on_any_event(self, event: FileSystemEvent) -> None:
        if event.is_directory:
            return

        src_path = getattr(event, "src_path", None)
        dest_path = getattr(event, "dest_path", None)
        if self.should_ignore(src_path) or self.should_ignore(dest_path):
            return
        user = getpass.getuser()
        source_hash = safe_hash(src_path, self.hash_algorithm) if src_path and os.path.exists(src_path) else None
        dest_hash = safe_hash(dest_path, self.hash_algorithm) if dest_path and os.path.exists(dest_path) else None

        event_payload: Dict[str, Any] = {
            "timestamp_utc": utc_now(),
            "event_type": event.event_type,
            "source_path": src_path,
            "destination_path": dest_path,
            "user": user,
            "host": socket.gethostname(),
            "process_name": guess_process_name(),
            "hash_algorithm": self.hash_algorithm,
            "source_hash": source_hash,
            "destination_hash": dest_hash,
        }
        violations = self.evaluate_policy(src_path, dest_path, user)
        event_payload["violations"] = violations
        insert_event(event_payload)

        if violations:
            alert_payload = {
                "timestamp_utc": utc_now(),
                "severity": "high",
                "message": "Policy violation detected",
                "violations": violations,
                "event": event_payload,
            }
            insert_alert(alert_payload)
            print(f"[ALERT] {violations} | src={src_path} dst={dest_path}")
        else:
            print(f"[INFO] {event.event_type} | src={src_path} dst={dest_path}")

    def should_ignore(self, file_path: Optional[str]) -> bool:
        if not file_path:
            return False
        resolved = normalize_path(file_path)
        return any(resolved.startswith(p) for p in self.ignored_paths)

    def path_is_sensitive(self, file_path: Optional[str]) -> bool:
        if not file_path:
            return False
        resolved = normalize_path(file_path)
        return any(resolved.startswith(s) for s in self.sensitive_paths)

    def destination_is_suspicious(self, file_path: Optional[str]) -> bool:
        if not file_path:
            return False
        p = file_path.lower()
        return any(keyword in p for keyword in self.suspicious_keywords)

    def extension_is_restricted(self, file_path: Optional[str]) -> bool:
        if not file_path:
            return False
        return Path(file_path).suffix.lower() in self.restricted_extensions

    def evaluate_policy(self, src_path: Optional[str], dest_path: Optional[str], user: str) -> list:
        violations = []
        user_l = user.lower()
        src_sensitive = self.path_is_sensitive(src_path)
        dst_sensitive = self.path_is_sensitive(dest_path)
        restricted_ext = self.extension_is_restricted(src_path) or self.extension_is_restricted(dest_path)
        suspicious_dst = self.destination_is_suspicious(dest_path)

        if self.restricted_users and user_l in self.restricted_users and (src_sensitive or dst_sensitive):
            violations.append("Restricted user accessed/moved sensitive file")
        if src_sensitive and suspicious_dst:
            violations.append("Sensitive file moved to suspicious destination")
        if restricted_ext and suspicious_dst:
            violations.append("Restricted extension transferred to suspicious destination")
        if src_sensitive and dest_path and not dst_sensitive:
            violations.append("Sensitive file moved outside protected path")
        return violations


def generate_report() -> Dict[str, Any]:
    summary = build_summary()
    report = {"generated_at_utc": utc_now(), **summary}
    REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=True)
    return report


def run_monitor(config_path: str, watch_path: str) -> None:
    try:
        from watchdog.observers import Observer  # type: ignore
    except Exception as exc:
        raise RuntimeError("watchdog required. Run: pip install -r requirements.txt") from exc

    init_db()
    policy = load_policy(config_path)
    observer = Observer()
    handler = SecureTransferMonitor(policy)
    observer.schedule(handler, watch_path, recursive=True)
    observer.start()

    print(f"[STARTED] Monitoring: {Path(watch_path).resolve()}")
    print(f"[DB] {Path('data/monitor.db').resolve()}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("[STOPPED]")
    observer.join()


def main() -> None:
    parser = argparse.ArgumentParser(description="Secure File Transfer Monitoring System")
    parser.add_argument("--config", default=DEFAULT_CONFIG, help="Path to policy JSON")
    parser.add_argument("--watch", default=".", help="Path to monitor recursively")
    parser.add_argument("--report", action="store_true", help="Generate report from database")
    args = parser.parse_args()

    init_db()
    if args.report:
        report = generate_report()
        print(json.dumps(report, indent=2))
        print(f"[REPORT] {REPORT_FILE.resolve()}")
        return
    run_monitor(args.config, args.watch)


if __name__ == "__main__":
    main()
