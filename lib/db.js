import { sql } from "@vercel/postgres";

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS file_events (
      id SERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      action_type TEXT NOT NULL,
      file_name TEXT NOT NULL,
      source_path TEXT,
      destination_path TEXT,
      username TEXT,
      hash_value TEXT,
      violations JSONB DEFAULT '[]'::jsonb
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      violation TEXT NOT NULL,
      event_id INT REFERENCES file_events(id) ON DELETE CASCADE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS alert_cases (
      alert_id INT PRIMARY KEY REFERENCES alerts(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'open',
      assignee TEXT NOT NULL DEFAULT 'unassigned',
      note TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_key TEXT PRIMARY KEY,
      theme TEXT NOT NULL DEFAULT 'dark',
      last_username TEXT DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS monitored_folders (
      id SERIAL PRIMARY KEY,
      user_key TEXT NOT NULL,
      folder_path TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_key, folder_path)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agent_control (
      control_key TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS agent_binaries (
      id SERIAL PRIMARY KEY,
      file_name TEXT NOT NULL,
      version TEXT NOT NULL DEFAULT '1.0.0',
      mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
      file_data BYTEA NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS monitored_endpoints (
      endpoint_key TEXT PRIMARY KEY,
      hostname TEXT NOT NULL DEFAULT 'unknown-host',
      username TEXT NOT NULL DEFAULT 'unknown',
      os_name TEXT NOT NULL DEFAULT 'Windows',
      agent_version TEXT NOT NULL DEFAULT '1.0.0',
      last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'online'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS security_policies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      pattern TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS api_tokens (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      token_prefix TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS integrity_baselines (
      file_path TEXT PRIMARY KEY,
      hash_value TEXT NOT NULL,
      mismatch_count INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id SERIAL PRIMARY KEY,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      ts TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    INSERT INTO admin_users (username, role)
    VALUES ('admin', 'admin')
    ON CONFLICT (username) DO NOTHING
  `;

  await sql`
    INSERT INTO security_policies (name, rule_type, pattern, enabled)
    SELECT * FROM (VALUES
      ('Restricted extensions', 'extension', '.pdf,.docx,.xlsx,.zip,.sql', TRUE),
      ('Suspicious destinations', 'destination', 'usb,onedrive,dropbox,\\\\,google drive', TRUE)
    ) AS t(name, rule_type, pattern, enabled)
    WHERE NOT EXISTS (SELECT 1 FROM security_policies)
  `;
}

export async function setAgentEnabled(enabled) {
  await initDb();
  await sql`
    INSERT INTO agent_control (control_key, enabled, updated_at)
    VALUES ('global', ${enabled}, NOW())
    ON CONFLICT (control_key)
    DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()
  `;
}

export async function isAgentEnabled() {
  await initDb();
  const { rows } = await sql`
    SELECT enabled
    FROM agent_control
    WHERE control_key = 'global'
    LIMIT 1
  `;
  return rows.length ? rows[0].enabled : true;
}

export async function saveAgentBinary({ fileName, version, mimeType, fileData }) {
  await initDb();
  await sql`UPDATE agent_binaries SET is_active = FALSE WHERE is_active = TRUE`;
  const { rows } = await sql`
    INSERT INTO agent_binaries (file_name, version, mime_type, file_data, is_active)
    VALUES (${fileName}, ${version || "1.0.0"}, ${mimeType || "application/octet-stream"}, ${fileData}, TRUE)
    RETURNING id, file_name, version, created_at
  `;
  return rows[0];
}

export async function getActiveAgentBinaryMeta() {
  await initDb();
  const { rows } = await sql`
    SELECT id, file_name, version, mime_type, created_at
    FROM agent_binaries
    WHERE is_active = TRUE
    ORDER BY id DESC
    LIMIT 1
  `;
  return rows.length ? rows[0] : null;
}

export async function getActiveAgentBinaryFile() {
  await initDb();
  const { rows } = await sql`
    SELECT file_name, version, mime_type, file_data
    FROM agent_binaries
    WHERE is_active = TRUE
    ORDER BY id DESC
    LIMIT 1
  `;
  return rows.length ? rows[0] : null;
}

export function evaluateViolations({ action_type, file_name, destination_path }) {
  const violations = [];
  const action = (action_type || "").toLowerCase();
  const lowerName = (file_name || "").toLowerCase();
  const lowerDest = (destination_path || "").toLowerCase();
  const restrictedExt = [".pdf", ".xlsx", ".docx", ".zip", ".sql"];
  const suspicious = ["usb", "onedrive", "dropbox", "\\\\", "google drive"];
  const isRestricted = restrictedExt.some((ext) => lowerName.endsWith(ext));

  if (isRestricted && suspicious.some((s) => lowerDest.includes(s))) {
    violations.push("Restricted file moved to suspicious destination");
  }

  if (isRestricted && action === "modified") {
    violations.push("Restricted file modified");
  }

  if (isRestricted && action === "deleted") {
    violations.push("Restricted file deleted");
  }

  return violations;
}
