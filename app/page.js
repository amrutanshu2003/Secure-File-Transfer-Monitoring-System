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
  const PAGE_SIZE = 100;
  const howToVideoUrl =
    process.env.NEXT_PUBLIC_HOW_TO_USE_VIDEO_URL ||
    "/videos/how%20to%20use_Secure%20File%20Transfer%20Monitoring.mp4";
  const [summary, setSummary] = useState({ total_events: 0, total_alerts: 0, event_type_counts: [] });
  const [events, setEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [eventsOffset, setEventsOffset] = useState(0);
  const [alertsOffset, setAlertsOffset] = useState(0);
  const [hasMoreEvents, setHasMoreEvents] = useState(true);
  const [hasMoreAlerts, setHasMoreAlerts] = useState(true);
  const [visibleEvents, setVisibleEvents] = useState(8);
  const [visibleAlerts, setVisibleAlerts] = useState(8);
  const [darkMode, setDarkMode] = useState(false);
  const [showHowToModal, setShowHowToModal] = useState(false);
  const [userKey, setUserKey] = useState("");
  const [lastUsername, setLastUsername] = useState("");
  const [historyCutoff, setHistoryCutoff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const applyCutoff = (items) => {
    const cutoffMs = historyCutoff ? new Date(historyCutoff).getTime() : 0;
    return cutoffMs ? items.filter((x) => new Date(x.ts).getTime() >= cutoffMs) : items;
  };

  const loadSummary = async () => {
    const s = await fetch("/api/summary", { cache: "no-store" }).then((r) => r.json());
    setSummary({
      total_events: s.total_events || 0,
      total_alerts: s.total_alerts || 0,
      event_type_counts: s.event_type_counts || []
    });
  };

  const loadEventsPage = async (offset, replace = false) => {
    const e = await fetch(`/api/events?limit=${PAGE_SIZE}&offset=${offset}`, { cache: "no-store" }).then((r) => r.json());
    const filtered = applyCutoff(e);
    setEvents((prev) => (replace ? filtered : [...prev, ...filtered]));
    setEventsOffset(offset + PAGE_SIZE);
    setHasMoreEvents(e.length === PAGE_SIZE);
  };

  const loadAlertsPage = async (offset, replace = false) => {
    const a = await fetch(`/api/alerts?limit=${PAGE_SIZE}&offset=${offset}`, { cache: "no-store" }).then((r) => r.json());
    const filtered = applyCutoff(a);
    setAlerts((prev) => (replace ? filtered : [...prev, ...filtered]));
    setAlertsOffset(offset + PAGE_SIZE);
    setHasMoreAlerts(a.length === PAGE_SIZE);
  };

  const load = async () => {
    const isInitialLoad = events.length === 0 && alerts.length === 0;
    if (isInitialLoad) setLoading(true);
    setLoadError("");
    try {
      await Promise.all([loadSummary(), loadEventsPage(0, true), loadAlertsPage(0, true)]);
    } catch (err) {
      setLoadError("Unable to load realtime data. Please retry.");
    } finally {
      if (isInitialLoad) setLoading(false);
    }
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
    const localTheme = localStorage.getItem("sftms_theme");
    if (localTheme) {
      setDarkMode(localTheme === "dark");
    }
    const localCutoff = localStorage.getItem("sftms_history_cutoff");
    if (localCutoff) setHistoryCutoff(localCutoff);
    const seen = localStorage.getItem("sftms_howto_seen");
    if (!seen) setShowHowToModal(true);
  }, []);

  useEffect(() => {
    if (!userKey) return;
    (async () => {
      const pref = await fetch(`/api/preferences?userKey=${encodeURIComponent(userKey)}`, { cache: "no-store" }).then((r) => r.json());
      const isDark = (pref.theme || "light") === "dark";
      setDarkMode(isDark);
      setLastUsername(pref.last_username || "");
    })();
  }, [userKey]);

  useEffect(() => {
    load();
    return undefined;
  }, [historyCutoff]);

  useEffect(() => {
    document.body.classList.toggle("dark", darkMode);
    localStorage.setItem("sftms_theme", darkMode ? "dark" : "light");
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

  const clearAll = async () => {
    const ok = window.confirm("Clear history only for your dashboard view?");
    if (!ok) return;
    const nowIso = new Date().toISOString();
    localStorage.setItem("sftms_history_cutoff", nowIso);
    setHistoryCutoff(nowIso);
    setEvents([]);
    setAlerts([]);
    setEventsOffset(0);
    setAlertsOffset(0);
    setHasMoreEvents(true);
    setHasMoreAlerts(true);
    setVisibleEvents(8);
    setVisibleAlerts(8);
  };

  const statusLabel = useMemo(() => (darkMode ? "Dark" : "Light"), [darkMode]);

  return (
    <main className="wrap">
      {showHowToModal ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>How To Use SFTMS</h3>
            <p className="tiny">Watch this quick setup video before using the dashboard.</p>
            <div className="video-wrap video-shell" style={{ marginTop: 10 }}>
              <video controls autoPlay preload="metadata" className="help-video">
                <source src={howToVideoUrl} type="video/mp4" />
              </video>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="outline-btn"
                onClick={() => {
                  localStorage.removeItem("sftms_howto_seen");
                  setShowHowToModal(false);
                }}
              >
                Show Every Time
              </button>
              <button
                type="button"
                className="danger-btn"
                onClick={() => {
                  localStorage.setItem("sftms_howto_seen", "1");
                  setShowHowToModal(false);
                }}
              >
                Don&apos;t show again
              </button>
              <button type="button" className="ghost" onClick={() => setShowHowToModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="nav">
        <div>
          <div className="brand">SFTMS Dashboard</div>
        </div>
        <div className="nav-actions">
          <a href="/admin" className="download-btn">Admin</a>
          <button type="button" className="ghost" onClick={() => setDarkMode((v) => !v)}>
            {statusLabel}
          </button>
          <button type="button" className="danger-btn" onClick={clearAll}>
            Clear History
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
          <div className="metric-head">Total Events <span className="live-dot live-green" aria-label="Live events" /></div>
          <div className="value">{loading ? <span className="skel skel-text" /> : summary.total_events}</div>
        </div>
        <div className="card metric-card">
          <div className="metric-head">Total Alerts <span className="live-dot live-red" aria-label="Live alerts" /></div>
          <div className="value danger">{loading ? <span className="skel skel-text" /> : summary.total_alerts}</div>
        </div>
      </section>
      {loadError ? <section className="panel"><div className="danger">{loadError}</div></section> : null}

      <section className="split-row">
        <div className="panel split-panel">
          <h3>One-Click Full-System Agent Setup</h3>
          <div className="tiny">Download EXE and run once. The agent installs, starts in the background, and auto-runs at startup.</div>
          <div style={{ marginTop: 10 }}>
            <a href="/api/download-agent" className="download-btn">Download Agent</a>
          </div>
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Step</th><th>Action</th></tr></thead>
            <tbody>
              <tr><td>1</td><td>Download Agent EXE.</td></tr>
              <tr><td>2</td><td>Run installer once. Monitoring starts automatically in background.</td></tr>
              <tr><td>3</td><td>Verify events and alerts are updating in real time on the dashboard.</td></tr>
            </tbody>
          </table>
        </div>

        <div className="panel split-panel">
          <h3>How To Use</h3>
          <div className="video-wrap video-shell">
            <video controls preload="metadata" className="help-video">
              <source src={howToVideoUrl} type="video/mp4" />
            </video>
          </div>
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
            {loading ? (
              <tr><td colSpan={4}>Loading alerts...</td></tr>
            ) : alerts.length ? alerts.slice(0, visibleAlerts).map((a) => (
              <tr key={a.id}>
                <td>{fmt(a.ts)}</td>
                <td className="danger">{a.violation}</td>
                <td>{a.username}</td>
                <td>{a.file_name}</td>
              </tr>
            )) : <tr><td colSpan={4}>No alerts yet.</td></tr>}
          </tbody>
        </table>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          {visibleAlerts < alerts.length ? (
            <button type="button" onClick={() => setVisibleAlerts((v) => v + 8)}>Load More Alerts</button>
          ) : null}
          {visibleAlerts > 8 ? (
            <button type="button" className="ghost" onClick={() => setVisibleAlerts(8)}>Show Less</button>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h3>Recent Events</h3>
        <table>
          <thead><tr><th>Time (IST)</th><th>Action</th><th>File</th><th>User</th><th>From</th><th>To</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}>Loading events...</td></tr>
            ) : events.length ? events.slice(0, visibleEvents).map((e) => (
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
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          {visibleEvents < events.length ? (
            <button type="button" onClick={() => setVisibleEvents((v) => v + 8)}>Load More Events</button>
          ) : null}
          {visibleEvents > 8 ? (
            <button type="button" className="ghost" onClick={() => setVisibleEvents(8)}>Show Less</button>
          ) : null}
        </div>
      </section>

      <footer className="footer">
        <div>Secure File Transfer Monitoring System</div>
        <div>Read-only realtime monitoring dashboard</div>
      </footer>
    </main>
  );
}
