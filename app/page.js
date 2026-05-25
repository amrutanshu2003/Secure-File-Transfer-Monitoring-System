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
  const [folders, setFolders] = useState([]);
  const [folderInput, setFolderInput] = useState("");
  const [agentConfigText, setAgentConfigText] = useState("");
  const [form, setForm] = useState({
    action_type: "modified",
    file_name: "",
    source_path: "",
    destination_path: "",
    username: ""
  });

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

  const loadFolders = async (key) => {
    if (!key) return;
    const list = await fetch(`/api/folders?userKey=${encodeURIComponent(key)}`, { cache: "no-store" }).then((r) => r.json());
    setFolders(list);
  };

  const loadAgentConfig = async (key) => {
    if (!key) return;
    const cfg = await fetch(`/api/agent-config?userKey=${encodeURIComponent(key)}`, { cache: "no-store" }).then((r) => r.json());
    setAgentConfigText(JSON.stringify(cfg, null, 2));
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
      setForm((v) => ({ ...v, username: pref.last_username || "" }));
      await loadFolders(userKey);
      await loadAgentConfig(userKey);
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
        last_username: form.username
      });
    }, 300);
    return () => clearTimeout(id);
  }, [darkMode, form.username, userKey]);

  const submit = async (ev) => {
    ev.preventDefault();
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm((v) => ({ ...v, file_name: "", source_path: "", destination_path: "" }));
    await load();
  };

  const clearAll = async () => {
    const ok = window.confirm("Are you sure you want to clear all events and alerts?");
    if (!ok) return;
    await fetch("/api/clear", { method: "POST" });
    await load();
  };

  const addFolder = async () => {
    if (!folderInput.trim() || !userKey) return;
    await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userKey, folder_path: folderInput.trim() })
    });
    setFolderInput("");
    await loadFolders(userKey);
    await loadAgentConfig(userKey);
  };

  const removeFolder = async (id) => {
    await fetch("/api/folders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userKey, id })
    });
    await loadFolders(userKey);
    await loadAgentConfig(userKey);
  };

  const copyConfig = async () => {
    if (!agentConfigText) return;
    await navigator.clipboard.writeText(agentConfigText);
    alert("agent.json copied");
  };

  const statusLabel = useMemo(() => (darkMode ? "Dark" : "Light"), [darkMode]);

  return (
    <main className="wrap">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />

      <nav className="nav">
        <div>
          <div className="brand">SFTMS Dashboard</div>
          <div className="tiny">Live Security Telemetry</div>
        </div>
        <div className="nav-actions">
          <button type="button" className="ghost" onClick={() => setDarkMode((v) => !v)}>
            {statusLabel} Mode
          </button>
          <button type="button" className="danger-btn" onClick={clearAll}>
            Clear Data
          </button>
        </div>
      </nav>

      <section className="hero">
        <p className="tiny">Security Operations Center</p>
        <h1>Secure File Transfer Monitoring</h1>
        <div>Realtime dashboard (Vercel + DB). Timezone: IST</div>
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
        <h3>Monitored Folders Setup</h3>
        <div className="tiny">Step 1: Add folders user wants to monitor on their machine.</div>
        <div className="row" style={{ marginTop: 10 }}>
          <div style={{ gridColumn: "span 4" }}>
            <label>Folder Path</label>
            <input
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              placeholder="C:\\Users\\username\\Documents\\Sensitive"
            />
          </div>
          <div className="submit-wrap">
            <button type="button" onClick={addFolder}>Add Folder</button>
          </div>
        </div>
        <table style={{ marginTop: 10 }}>
          <thead><tr><th>Saved Monitored Folders</th><th>Action</th></tr></thead>
          <tbody>
            {folders.length ? folders.map((f) => (
              <tr key={f.id}>
                <td>{f.folder_path}</td>
                <td><button type="button" className="danger-btn" onClick={() => removeFolder(f.id)}>Remove</button></td>
              </tr>
            )) : <tr><td colSpan={2}>No folders added yet.</td></tr>}
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h3>Generated Agent Config (agent.json)</h3>
        <div className="tiny">Step 2: Copy this config and use with local agent.</div>
        <textarea className="config-box" value={agentConfigText} readOnly />
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={copyConfig}>Copy Config</button>
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
          <div className="submit-wrap">
            <button type="submit">Save Event</button>
          </div>
        </form>
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
        <div>Preference sync enabled (DB-backed theme + last user)</div>
      </footer>
    </main>
  );
}
