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
}

export function evaluateViolations({ file_name, destination_path }) {
  const violations = [];
  const lowerName = (file_name || "").toLowerCase();
  const lowerDest = (destination_path || "").toLowerCase();
  const restrictedExt = [".pdf", ".xlsx", ".docx", ".zip", ".sql"];
  const suspicious = ["usb", "onedrive", "dropbox", "\\\\", "google drive"];

  if (restrictedExt.some((ext) => lowerName.endsWith(ext)) && suspicious.some((s) => lowerDest.includes(s))) {
    violations.push("Restricted file moved to suspicious destination");
  }
  return violations;
}
