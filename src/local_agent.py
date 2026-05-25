import argparse
import getpass
import hashlib
import json
import os
import socket
import time
from pathlib import Path
from typing import Any, Dict, Optional
from urllib import error, request

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer


DEFAULT_AGENT_CONFIG = "config/agent.json"


def load_config(path: str) -> Dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_path(path: str) -> str:
    return str(Path(path).resolve()).lower()


def safe_hash(path: Optional[str]) -> Optional[str]:
    if not path or not os.path.exists(path) or os.path.isdir(path):
        return None
    try:
        h = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return None


def to_action(event_type: str) -> str:
    mapping = {
        "created": "created",
        "modified": "modified",
        "moved": "moved",
        "deleted": "deleted",
    }
    return mapping.get(event_type, "modified")


def post_event(
    base_url: str,
    endpoint: str,
    payload: Dict[str, Any],
    timeout_seconds: int,
    retries: int,
) -> bool:
    url = f"{base_url.rstrip('/')}{endpoint}"
    body = json.dumps(payload).encode("utf-8")

    for attempt in range(1, retries + 1):
        req = request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=timeout_seconds) as resp:
                if 200 <= resp.status < 300:
                    return True
        except error.URLError:
            time.sleep(min(2 * attempt, 5))
        except Exception:
            time.sleep(min(2 * attempt, 5))
    return False


class ApiForwardHandler(FileSystemEventHandler):
    def __init__(self, config: Dict[str, Any]) -> None:
        self.base_url = config["api_base_url"]
        self.endpoint = config.get("events_endpoint", "/api/events")
        self.timeout_seconds = int(config.get("request_timeout_seconds", 8))
        self.retries = int(config.get("retry_attempts", 3))
        self.ignore_paths = [normalize_path(p) for p in config.get("ignore_paths", [])]

    def should_ignore(self, path: Optional[str]) -> bool:
        if not path:
            return False
        resolved = normalize_path(path)
        return any(resolved.startswith(i) for i in self.ignore_paths)

    def on_any_event(self, event: FileSystemEvent) -> None:
        if event.is_directory:
            return

        src = getattr(event, "src_path", None)
        dst = getattr(event, "dest_path", None)

        if self.should_ignore(src) or self.should_ignore(dst):
            return

        payload = {
            "action_type": to_action(event.event_type),
            "file_name": Path(dst or src or "unknown.txt").name,
            "source_path": src or "",
            "destination_path": dst or "",
            "username": getpass.getuser(),
            "host": socket.gethostname(),
            "hash_value": safe_hash(dst or src),
        }
        ok = post_event(
            self.base_url,
            self.endpoint,
            payload,
            timeout_seconds=self.timeout_seconds,
            retries=self.retries,
        )
        if ok:
            print(f"[SENT] {payload['action_type']} {payload['file_name']}")
        else:
            print(f"[FAILED] {payload['action_type']} {payload['file_name']}")


def run_agent(config_path: str) -> None:
    config = load_config(config_path)
    watch_paths = config.get("watch_paths", [])
    recursive = bool(config.get("recursive", True))
    if not watch_paths:
        raise ValueError("No watch_paths found in config.")

    observer = Observer()
    handler = ApiForwardHandler(config)

    for p in watch_paths:
        observer.schedule(handler, p, recursive=recursive)
        print(f"[WATCH] {p}")

    print(f"[TARGET] {config['api_base_url'].rstrip('/')}{config.get('events_endpoint', '/api/events')}")
    observer.start()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        print("[STOPPED] local agent")
    observer.join()


def main() -> None:
    parser = argparse.ArgumentParser(description="Local Windows file-monitor agent to forward events to Vercel API")
    parser.add_argument("--config", default=DEFAULT_AGENT_CONFIG, help="Path to agent JSON config")
    args = parser.parse_args()
    run_agent(args.config)


if __name__ == "__main__":
    main()
