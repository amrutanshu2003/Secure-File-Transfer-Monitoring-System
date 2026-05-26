import crypto from "crypto";
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { evaluateViolations, initDb, isAgentEnabled } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 200), 10000);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
  const { rows } = await sql`
    SELECT id, ts, action_type, file_name, source_path, destination_path, username, hash_value, violations
    FROM file_events
    ORDER BY id DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await initDb();
  const enabled = await isAgentEnabled();
  if (!enabled) {
    return NextResponse.json({ ok: false, disabled: true }, { status: 202 });
  }

  const body = await request.json();
  const action_type = body.action_type || "modified";
  const file_name = body.file_name || "unknown.txt";
  const source_path = body.source_path || "";
  const destination_path = body.destination_path || "";
  const username = body.username || "unknown";
  const hostname = body.hostname || body.machine_name || "unknown-host";
  const endpointKey = body.endpoint_key || `${hostname}:${username}`;
  const agentVersion = body.agent_version || "1.0.0";
  const hash_value = crypto.createHash("sha256").update(`${file_name}:${Date.now()}`).digest("hex");
  const violations = evaluateViolations({ action_type, file_name, destination_path });

  await sql`
    INSERT INTO monitored_endpoints (endpoint_key, hostname, username, os_name, agent_version, last_seen, status)
    VALUES (${endpointKey}, ${hostname}, ${username}, ${body.os_name || "Windows"}, ${agentVersion}, NOW(), 'online')
    ON CONFLICT (endpoint_key)
    DO UPDATE SET
      hostname = EXCLUDED.hostname,
      username = EXCLUDED.username,
      os_name = EXCLUDED.os_name,
      agent_version = EXCLUDED.agent_version,
      last_seen = NOW(),
      status = 'online'
  `;

  if (source_path || destination_path) {
    const baselinePath = destination_path || source_path;
    const existing = await sql`SELECT hash_value FROM integrity_baselines WHERE file_path = ${baselinePath} LIMIT 1`;
    if (!existing.rows.length) {
      await sql`
        INSERT INTO integrity_baselines (file_path, hash_value, mismatch_count, updated_at)
        VALUES (${baselinePath}, ${hash_value}, 0, NOW())
      `;
    } else if (existing.rows[0].hash_value !== hash_value && action_type === "modified") {
      await sql`
        UPDATE integrity_baselines
        SET hash_value = ${hash_value}, mismatch_count = mismatch_count + 1, updated_at = NOW()
        WHERE file_path = ${baselinePath}
      `;
      violations.push("Integrity hash mismatch detected");
    }
  }

  const inserted = await sql`
    INSERT INTO file_events (action_type, file_name, source_path, destination_path, username, hash_value, violations)
    VALUES (${action_type}, ${file_name}, ${source_path}, ${destination_path}, ${username}, ${hash_value}, ${JSON.stringify(violations)}::jsonb)
    RETURNING id
  `;

  const eventId = inserted.rows[0].id;

  for (const violation of violations) {
    await sql`
      INSERT INTO alerts (severity, message, violation, event_id)
      VALUES ('high', 'Policy violation detected', ${violation}, ${eventId})
    `;
  }

  return NextResponse.json({ ok: true, event_id: eventId, violations });
}
