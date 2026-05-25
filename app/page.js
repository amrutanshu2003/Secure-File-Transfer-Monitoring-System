"use client";

import { useEffect, useMemo, useState } from "react";

function fmt(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

function getUserKey() {
  const keyName = "sftms_user_key";
  let key = localStorage.getItem(keyName);
  if (!key) {
    key = `user_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(keyName, key);
  }
  return key;
}

export default function Home() {
  const [summary, setSummary] = useState({ total_events: 0, total_alerts: 0, event_type_counts: [] });
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [userKey, setUserKey] = useState("");
  const [lastUsername, setLastUsername] = useState("");

  const load = async () => {
    const [s, e, a] = await Promise.all([
      fetch("/api/summary", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/events", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/alerts", { cache: "no-store" }).then((r) => r.json())
    ]);
    setSummary(s);
    setEvents(e);
    setAlerts(a);
  };

  const savePreferences = async (payload) => {
    if (!userKey) return;
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userKey,
        theme: payload.theme,
        last_username: payload.last_username
      })
    });
  };

  useEffect(() => {
    const k = getUserKey();
    setUserKey(k);
  }, []);

  useEffect(() => {
    if (!userKey) return;
    (async () => {
      const pref = await fetch(`/api/preferences?userKey=${encodeURIComponent(userKey)}`, { cache: "no-store" }).then((r) => r.json());
      const isDark = (pref.theme || "dark") === "dark";
      setDarkMode(isDark);
      setLastUsername(pref.last_username || "");
    })();
  }, [userKey]);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (!userKey) return;
    const id = setTimeout(() => {
      savePreferences({
        theme: darkMode ? "dark" : "light",
        last_username: lastUsername
      });
    }, 300);
    return () => clearTimeout(id);
  }, [darkMode, lastUsername, userKey]);

  const statusLabel = useMemo(() => (darkMode ? "Dark" : "Light"), [darkMode]);

  return (
    <main className="wrap">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />

      <nav className="nav">
        <div>
          <div className="brand">SFTMS Dashboard</div>
        </div>
        <div className="nav-actions">
          <button type="button" className="ghost" onClick={() => setDarkMode((v) => !v)}>
            {statusLabel} Mode
          </button>
        </div>
      </nav>

      <section className="hero">
        <p className="tiny">Security Operations Center</p>
        <h1>Secure File Transfer Monitoring</h1>
        <div className="tiny">Realtime feed from local system agent</div>
      </section>

      <section className="row">
        <div className="card metric-card">
          <div>Total Events</div>
          <div className="value">{summary.total_events}</div>
        </div>
        <div className="card metric-card">
          <div>Total Alerts</div>
          <div className="value danger">{summary.total_alerts}</div>
        </div>
      </section>

      <section className="panel">
        <h3>Live Monitoring Setup</h3>
        <div className="tiny">Run local agent on monitored machine:</div>
        <textarea
          className="config-box"
          readOnly
          value={`python src/local_agent.py --config config/agent.json`}
        />
        <div className="tiny" style={{ marginTop: 8 }}>
          Current preferred username: {lastUsername || "not set"}
        </div>
      </section>

      <section className="panel">
        <h3>Event Type Counts</h3>
        <table>
          <thead><tr><th>Type</th><th>Count</th></tr></thead>
          <tbody>
            {summary.event_type_counts.length ? summary.event_type_counts.map((item) => (
              <tr key={item.action_type}><td>{item.action_type}</td><td>{item.c}</td></tr>
            )) : <tr><td colSpan={2}>No events yet.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Recent Alerts</h3>
        <table>
          <thead><tr><th>Time (IST)</th><th>Violation</th><th>User</th><th>File</th></tr></thead>
          <tbody>
            {alerts.length ? alerts.map((a) => (
              <tr key={a.id}>
                <td>{fmt(a.ts)}</td>
                <td className="danger">{a.violation}</td>
                <td>{a.username}</td>
                <td>{a.file_name}</td>
              </tr>
            )) : <tr><td colSpan={4}>No alerts yet.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Recent Events</h3>
        <table>
          <thead><tr><th>Time (IST)</th><th>Action</th><th>File</th><th>User</th><th>From</th><th>To</th></tr></thead>
          <tbody>
            {events.length ? events.map((e) => (
              <tr key={e.id}>
                <td>{fmt(e.ts)}</td>
                <td>{e.action_type}</td>
                <td>{e.file_name}</td>
                <td>{e.username}</td>
                <td>{e.source_path}</td>
                <td>{e.destination_path}</td>
              </tr>
            )) : <tr><td colSpan={6}>No events yet.</td></tr>}
          </tbody>
        </table>
      </section>

      <footer className="footer">
        <div>Secure File Transfer Monitoring System</div>
        <div>Read-only realtime monitoring dashboard</div>
      </footer>
    </main>
  );
}
