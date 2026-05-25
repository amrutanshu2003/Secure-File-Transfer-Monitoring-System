import crypto from "crypto";
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { evaluateViolations, initDb, isAgentEnabled } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  await initDb();
  const { rows } = await sql`
    SELECT id, ts, action_type, file_name, source_path, destination_path, username, hash_value, violations
    FROM file_events
    ORDER BY id DESC
    LIMIT 100
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
  const hash_value = crypto.createHash("sha256").update(`${file_name}:${Date.now()}`).digest("hex");
  const violations = evaluateViolations({ file_name, destination_path });

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
