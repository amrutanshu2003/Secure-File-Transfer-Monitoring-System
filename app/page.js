"use client";

import { useEffect, useState } from "react";

function fmt(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

export default function Home() {
  const [summary, setSummary] = useState({ total_events: 0, total_alerts: 0, event_type_counts: [] });
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [form, setForm] = useState({
    action_type: "modified",
    file_name: "",
    source_path: "",
    destination_path: "",
    username: ""
  });

  const load = async () => {
    const [s, e, a] = await Promise.all([
      fetch("/api/summary").then((r) => r.json()),
      fetch("/api/events").then((r) => r.json()),
      fetch("/api/alerts").then((r) => r.json())
    ]);
    setSummary(s);
    setEvents(e);
    setAlerts(a);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const submit = async (ev) => {
    ev.preventDefault();
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ ...form, file_name: "", source_path: "", destination_path: "" });
    await load();
  };

  const clearAll = async () => {
    const ok = window.confirm("Are you sure you want to clear all events and alerts?");
    if (!ok) return;
    await fetch("/api/clear", { method: "POST" });
    await load();
  };

  return (
    <main className="wrap">
      <nav className="nav">
        <div className="brand">SFTMS Dashboard</div>
        <div className="nav-actions">
          <button type="button" className="ghost" onClick={() => setDarkMode((v) => !v)}>
            {darkMode ? "☀️" : "🌙"}
          </button>
          <button type="button" className="danger-btn" onClick={clearAll}>
            Clear Data
          </button>
        </div>
      </nav>

      <section className="hero">
        <h1>Secure File Transfer Monitoring</h1>
        <div>Realtime dashboard (Vercel + DB). Timezone: IST</div>
      </section>

      <section className="row">
        <div className="card">
          <div>Total Events</div>
          <div className="value">{summary.total_events}</div>
        </div>
        <div className="card">
          <div>Total Alerts</div>
          <div className="value danger">{summary.total_alerts}</div>
        </div>
      </section>

      <section className="panel">
        <h3>Send File Action (Realtime Input)</h3>
        <form onSubmit={submit} className="row">
          <div>
            <label>Action</label>
            <select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })}>
              <option value="created">created</option>
              <option value="modified">modified</option>
              <option value="moved">moved</option>
              <option value="deleted">deleted</option>
            </select>
          </div>
          <div>
            <label>File Name</label>
            <input value={form.file_name} onChange={(e) => setForm({ ...form, file_name: e.target.value })} required />
          </div>
          <div>
            <label>User</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="amrut" />
          </div>
          <div>
            <label>Source Path</label>
            <input value={form.source_path} onChange={(e) => setForm({ ...form, source_path: e.target.value })} />
          </div>
          <div>
            <label>Destination Path</label>
            <input value={form.destination_path} onChange={(e) => setForm({ ...form, destination_path: e.target.value })} />
          </div>
          <div style={{ alignSelf: "end" }}>
            <button type="submit">Save Event</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Event Type Counts</h3>
        <table>
          <thead><tr><th>Type</th><th>Count</th></tr></thead>
          <tbody>
            {summary.event_type_counts.map((item) => (
              <tr key={item.action_type}><td>{item.action_type}</td><td>{item.c}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Recent Alerts</h3>
        <table>
          <thead><tr><th>Time (IST)</th><th>Violation</th><th>User</th><th>File</th></tr></thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id}>
                <td>{fmt(a.ts)}</td>
                <td className="danger">{a.violation}</td>
                <td>{a.username}</td>
                <td>{a.file_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Recent Events</h3>
        <table>
          <thead><tr><th>Time (IST)</th><th>Action</th><th>File</th><th>User</th><th>From</th><th>To</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td>{fmt(e.ts)}</td>
                <td>{e.action_type}</td>
                <td>{e.file_name}</td>
                <td>{e.username}</td>
                <td>{e.source_path}</td>
                <td>{e.destination_path}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">
        <div>Secure File Transfer Monitoring System</div>
        <div>Built for realtime alerts and audit visibility</div>
      </footer>
    </main>
  );
}
