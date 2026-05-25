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
