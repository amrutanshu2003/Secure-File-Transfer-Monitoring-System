"use client";

import { useEffect, useState } from "react";

function fmt(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

const emptyOverview = { totals: { events: 0, alerts: 0, endpoints: 0, open_alerts: 0 }, severity_breakdown: [], top_violations: [], actions_24h: [] };

export default function AdminPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [overview, setOverview] = useState(emptyOverview);
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [reports, setReports] = useState({ daily_events: [], daily_alerts: [], top_violations: [] });
  const [settings, setSettings] = useState({ timezone: "Asia/Kolkata", retention_days: 90, notification_channels: ["email"], webhook_url: "" });
  const [users, setUsers] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [health, setHealth] = useState({ status: "unknown" });
  const [agentEnabled, setAgentEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [visibleAdminEvents, setVisibleAdminEvents] = useState(8);
  const [visibleAdminAlerts, setVisibleAdminAlerts] = useState(8);
  const [newPolicy, setNewPolicy] = useState({ name: "", rule_type: "destination", pattern: "" });
  const [newUser, setNewUser] = useState({ username: "", role: "viewer" });
  const [newTokenName, setNewTokenName] = useState("");
  const [createdToken, setCreatedToken] = useState("");

  const load = async () => {
    const isInitialLoad = events.length === 0 && alerts.length === 0;
    if (isInitialLoad) setLoading(true);
    setLoadError("");
    try {
      const [o, e, a, ep, p, r, s, u, t, h, c] = await Promise.all([
        fetch("/api/admin/overview", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/events", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/admin/alerts", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/admin/endpoints", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/admin/policies", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/admin/reports", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/admin/settings", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/admin/users", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/admin/tokens", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/admin/health", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/agent-control", { cache: "no-store" }).then((x) => x.json())
      ]);

      setOverview(o);
      setEvents(e);
      setAlerts(a);
      setEndpoints(ep);
      setPolicies(p);
      setReports(r);
      setSettings(s);
      setUsers(u);
      setTokens(t);
      setHealth(h);
      setAgentEnabled(c.enabled !== false);
    } catch (err) {
      setLoadError("Unable to load admin data. Check server/DB connection.");
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  useEffect(() => {
    const localTheme = localStorage.getItem("sftms_theme");
    if (localTheme) setDarkMode(localTheme === "dark");
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("sftms_theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const updateAlert = async (id, status) => {
    await fetch("/api/admin/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alert_id: id, status, assignee: "admin" })
    });
    load();
  };

  const addPolicy = async () => {
    if (!newPolicy.name || !newPolicy.pattern) return;
    await fetch("/api/admin/policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newPolicy) });
    setNewPolicy({ name: "", rule_type: "destination", pattern: "" });
    load();
  };

  const removePolicy = async (id) => {
    await fetch(`/api/admin/policies?id=${id}`, { method: "DELETE" });
    load();
  };

  const saveSettings = async () => {
    await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    load();
  };

  const upsertUser = async () => {
    if (!newUser.username) return;
    await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newUser) });
    setNewUser({ username: "", role: "viewer" });
    load();
  };

  const createToken = async () => {
    const res = await fetch("/api/admin/tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTokenName || "SFTMS API Key" }) }).then((x) => x.json());
    setCreatedToken(res.token || "");
    setNewTokenName("");
    load();
  };

  const toggleToken = async (id, active) => {
    await fetch("/api/admin/tokens", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, is_active: !active }) });
    load();
  };

  const clearData = async () => {
    if (!window.confirm("Clear all events and alerts?")) return;
    await fetch("/api/clear", { method: "POST" });
    setOverview(emptyOverview);
    setEvents([]);
    setAlerts([]);
    setEndpoints([]);
    setReports({ daily_events: [], daily_alerts: [], top_violations: [] });
    load();
  };

  const toggleAgent = async () => {
    await fetch("/api/agent-control", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !agentEnabled }) });
    load();
  };

  return (
    <main className="wrap">
      <nav className="nav">
        <div className="brand">SFTMS Admin Panel</div>
        <div className="nav-actions">
          <a className="download-btn" href="/">Go Dashboard</a>
          <button type="button" className="ghost" onClick={() => setDarkMode((v) => !v)}>
            {darkMode ? "Dark" : "Light"}
          </button>
          <button type="button" className="danger-btn" onClick={clearData}>Clear Data</button>
        </div>
      </nav>

      <section className="row">
        <div className="card metric-card"><div className="metric-head">Total Events <span className="live-dot live-green" aria-label="Live events" /></div><div className="value">{loading ? "-" : overview.totals.events}</div></div>
        <div className="card metric-card"><div className="metric-head">Total Alerts <span className="live-dot live-red" aria-label="Live alerts" /></div><div className="value danger">{loading ? "-" : overview.totals.alerts}</div></div>
        <div className="card metric-card"><div className="metric-head">Endpoints <span className="live-dot live-yellow" aria-label="Live endpoints" /></div><div className="value">{loading ? "-" : overview.totals.endpoints}</div></div>
        <div className="card metric-card"><div className="metric-head">Open Alerts <span className="live-dot live-blue" aria-label="Live open alerts" /></div><div className="value danger">{loading ? "-" : overview.totals.open_alerts}</div></div>
      </section>
      {loadError ? <section className="panel"><div className="danger">{loadError}</div></section> : null}

      <section className="panel"><h3>Live Event Stream</h3>
        <table><thead><tr><th>Time</th><th>Action</th><th>File</th><th>User</th><th>Path</th></tr></thead><tbody>
          {loading ? (
            <>
              <tr><td colSpan={5}>Loading...</td></tr>
              <tr><td colSpan={5}>Loading...</td></tr>
            </>
          ) : events.slice(0, visibleAdminEvents).map((e) => <tr key={e.id}><td>{fmt(e.ts)}</td><td>{e.action_type}</td><td>{e.file_name}</td><td>{e.username}</td><td>{e.destination_path || e.source_path}</td></tr>)}
        </tbody></table>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          {visibleAdminEvents < events.length ? (
            <button type="button" onClick={() => setVisibleAdminEvents((v) => v + 8)}>Load More Events</button>
          ) : null}
          {visibleAdminEvents > 8 ? (
            <button type="button" className="ghost" onClick={() => setVisibleAdminEvents(8)}>Show Less</button>
          ) : null}
        </div>
      </section>

      <section className="panel"><h3>Alert Center</h3>
        <table><thead><tr><th>Time</th><th>Severity</th><th>Violation</th><th>Status</th><th>Action</th></tr></thead><tbody>
          {loading ? (
            <>
              <tr><td colSpan={5}>Loading...</td></tr>
              <tr><td colSpan={5}>Loading...</td></tr>
            </>
          ) : alerts.slice(0, visibleAdminAlerts).map((a) => <tr key={a.id}><td>{fmt(a.ts)}</td><td className="danger">{a.severity}</td><td>{a.violation}</td><td>{a.status}</td><td><button type="button" onClick={() => updateAlert(a.id, a.status === "resolved" ? "open" : "resolved")}>{a.status === "resolved" ? "Reopen" : "Resolve"}</button></td></tr>)}
        </tbody></table>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          {visibleAdminAlerts < alerts.length ? (
            <button type="button" onClick={() => setVisibleAdminAlerts((v) => v + 8)}>Load More Alerts</button>
          ) : null}
          {visibleAdminAlerts > 8 ? (
            <button type="button" className="ghost" onClick={() => setVisibleAdminAlerts(8)}>Show Less</button>
          ) : null}
        </div>
      </section>

      <section className="panel"><h3>Monitored Endpoints</h3>
        <table><thead><tr><th>Endpoint</th><th>User</th><th>OS</th><th>Agent</th><th>Status</th><th>Last Seen</th></tr></thead><tbody>
          {loading ? (
            <>
              <tr><td colSpan={6}>Loading...</td></tr>
              <tr><td colSpan={6}>Loading...</td></tr>
            </>
          ) : endpoints.length ? endpoints.map((x) => <tr key={x.endpoint_key}><td>{x.hostname}</td><td>{x.username}</td><td>{x.os_name}</td><td>{x.agent_version}</td><td>{x.computed_status}</td><td>{fmt(x.last_seen)}</td></tr>) : <tr><td colSpan={6}>No endpoints yet.</td></tr>}
        </tbody></table>
      </section>

      <section className="split-row">
        <div className="panel split-panel">
          <h3>Policy Management</h3>
          <div className="form-grid">
            <input placeholder="Policy name" value={newPolicy.name} onChange={(e) => setNewPolicy((v) => ({ ...v, name: e.target.value }))} />
            <select value={newPolicy.rule_type} onChange={(e) => setNewPolicy((v) => ({ ...v, rule_type: e.target.value }))}><option value="destination">Destination</option><option value="extension">Extension</option><option value="path">Path</option></select>
            <input placeholder="Pattern" value={newPolicy.pattern} onChange={(e) => setNewPolicy((v) => ({ ...v, pattern: e.target.value }))} />
            <button type="button" onClick={addPolicy}>Add Policy</button>
          </div>
          <table><thead><tr><th>Name</th><th>Type</th><th>Pattern</th><th>Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={4}>Loading...</td></tr> : policies.length ? policies.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.rule_type}</td><td>{p.pattern}</td><td><button type="button" className="danger-btn" onClick={() => removePolicy(p.id)}>Delete</button></td></tr>) : <tr><td colSpan={4}>No policies found.</td></tr>}</tbody></table>
        </div>

        <div className="panel split-panel">
          <h3>Reports</h3>
          <table><thead><tr><th>Top Violations</th><th>Count</th></tr></thead><tbody>{loading ? <tr><td colSpan={2}>Loading...</td></tr> : reports.top_violations.length ? reports.top_violations.map((v) => <tr key={v.violation}><td>{v.violation}</td><td>{v.c}</td></tr>) : <tr><td colSpan={2}>No report data.</td></tr>}</tbody></table>
          <table style={{ marginTop: 10 }}><thead><tr><th>Action (24h)</th><th>Count</th></tr></thead><tbody>{loading ? <tr><td colSpan={2}>Loading...</td></tr> : overview.actions_24h.length ? overview.actions_24h.map((x) => <tr key={x.action_type}><td>{x.action_type}</td><td>{x.c}</td></tr>) : <tr><td colSpan={2}>No activity data.</td></tr>}</tbody></table>
        </div>
      </section>

      <section className="split-row">
        <div className="panel split-panel"><h3>User & Role Management</h3>
          <div className="form-grid">
            <input placeholder="username" value={newUser.username} onChange={(e) => setNewUser((v) => ({ ...v, username: e.target.value }))} />
            <select value={newUser.role} onChange={(e) => setNewUser((v) => ({ ...v, role: e.target.value }))}><option value="admin">admin</option><option value="analyst">analyst</option><option value="viewer">viewer</option></select>
            <button type="button" onClick={upsertUser}>Save User</button>
          </div>
          <table><thead><tr><th>User</th><th>Role</th></tr></thead><tbody>{loading ? <tr><td colSpan={2}>Loading...</td></tr> : users.length ? users.map((u) => <tr key={u.id}><td>{u.username}</td><td>{u.role}</td></tr>) : <tr><td colSpan={2}>No users found.</td></tr>}</tbody></table>
        </div>

        <div className="panel split-panel"><h3>API & Security</h3>
          <div className="form-grid"><input placeholder="Token name" value={newTokenName} onChange={(e) => setNewTokenName(e.target.value)} /><button type="button" onClick={createToken}>Create API Key</button></div>
          {createdToken ? <textarea readOnly value={`Copy now (shown once): ${createdToken}`} /> : null}
          <table><thead><tr><th>Name</th><th>Prefix</th><th>Status</th><th>Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={4}>Loading...</td></tr> : tokens.length ? tokens.map((tk) => <tr key={tk.id}><td>{tk.name}</td><td>{tk.token_prefix}</td><td>{tk.is_active ? "active" : "disabled"}</td><td><button type="button" onClick={() => toggleToken(tk.id, tk.is_active)}>{tk.is_active ? "Disable" : "Enable"}</button></td></tr>) : <tr><td colSpan={4}>No API keys found.</td></tr>}</tbody></table>
        </div>
      </section>

      <section className="split-row">
        <div className="panel split-panel"><h3>Agent Control</h3>
          <button type="button" onClick={toggleAgent}>{agentEnabled ? "Stop Ingestion" : "Start Ingestion"}</button>
          <div className="tiny" style={{ marginTop: 10 }}>Current: {agentEnabled ? "enabled" : "disabled"}</div>
          <div style={{ marginTop: 12 }}><a href="/api/download-agent" className="download-btn">Download Latest Agent EXE</a></div>
        </div>

        <div className="panel split-panel"><h3>Platform Settings</h3>
          <div className="form-grid">
            <input value={settings.timezone || "Asia/Kolkata"} onChange={(e) => setSettings((v) => ({ ...v, timezone: e.target.value }))} placeholder="Timezone" />
            <input type="number" value={settings.retention_days || 90} onChange={(e) => setSettings((v) => ({ ...v, retention_days: Number(e.target.value || 90) }))} placeholder="Retention days" />
            <input value={(settings.notification_channels || []).join(",")} onChange={(e) => setSettings((v) => ({ ...v, notification_channels: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }))} placeholder="email,slack" />
            <input value={settings.webhook_url || ""} onChange={(e) => setSettings((v) => ({ ...v, webhook_url: e.target.value }))} placeholder="Webhook URL" />
            <button type="button" onClick={saveSettings}>Save Settings</button>
          </div>
        </div>
      </section>

      <section className="panel"><h3>Data Tools / DB Health</h3>
        <div className="tiny">
          {loading ? "Loading..." : `Status: ${health.status} | DB Size: ${health.db_size} | DB Time: ${fmt(health.db_time)} | Admin Audit Logs: ${health.audit_log_entries}`}
        </div>
      </section>
    </main>
  );
}

