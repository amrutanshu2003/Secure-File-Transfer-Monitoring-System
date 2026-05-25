import json
from datetime import datetime
from zoneinfo import ZoneInfo
from flask import Flask, jsonify, render_template, request

from db import build_summary, clear_all_data, fetch_recent_alerts, fetch_recent_events, init_db
from monitor import generate_report


app = Flask(__name__)


def to_ist(ts: str) -> str:
    if not ts:
        return ""
    try:
        dt = datetime.fromisoformat(ts)
        if dt.tzinfo is None:
            return ts
        return dt.astimezone(ZoneInfo("Asia/Kolkata")).strftime("%d-%m-%Y %I:%M:%S %p IST")
    except Exception:
        return ts


@app.route("/")
def index():
    init_db()
    summary = build_summary()
    events = fetch_recent_events(limit=50)
    alerts = fetch_recent_alerts(limit=50)
    for e in events:
        e["timestamp_ist"] = to_ist(e.get("timestamp_utc", ""))
    for a in alerts:
        a["timestamp_ist"] = to_ist(a.get("timestamp_utc", ""))
    event_counts = list(summary.get("event_type_counts", {}).items())
    violation_counts = list(summary.get("top_violation_types", {}).items())
    return render_template(
        "index.html",
        summary=summary,
        events=events,
        alerts=alerts,
        event_counts=event_counts,
        violation_counts=violation_counts,
    )


@app.route("/api/summary")
def api_summary():
    init_db()
    return jsonify(build_summary())


@app.route("/api/events")
def api_events():
    init_db()
    return jsonify(fetch_recent_events(limit=200))


@app.route("/api/alerts")
def api_alerts():
    init_db()
    return jsonify(fetch_recent_alerts(limit=200))


@app.route("/api/report")
def api_report():
    init_db()
    report = generate_report()
    return app.response_class(
        response=json.dumps(report, indent=2),
        status=200,
        mimetype="application/json",
    )

@app.route("/api/clear", methods=["POST"])
def api_clear():
    init_db()
    clear_all_data()
    return jsonify({"ok": True})


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
