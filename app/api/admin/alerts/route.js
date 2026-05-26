import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const { rows } = await sql`
    SELECT
      a.id,
      a.ts,
      a.severity,
      a.violation,
      a.message,
      e.file_name,
      e.username,
      COALESCE(c.status, 'open') AS status,
      COALESCE(c.assignee, 'unassigned') AS assignee,
      COALESCE(c.note, '') AS note
    FROM alerts a
    LEFT JOIN file_events e ON e.id = a.event_id
    LEFT JOIN alert_cases c ON c.alert_id = a.id
    ORDER BY a.id DESC
    LIMIT 200
  `;
  return NextResponse.json(rows);
}

export async function PATCH(request) {
  await initDb();
  const body = await request.json();
  const alertId = Number(body.alert_id || 0);
  const status = body.status || "open";
  const assignee = body.assignee || "unassigned";
  const note = body.note || "";

  if (!alertId) return NextResponse.json({ ok: false, error: "alert_id required" }, { status: 400 });

  await sql`
    INSERT INTO alert_cases (alert_id, status, assignee, note, updated_at)
    VALUES (${alertId}, ${status}, ${assignee}, ${note}, NOW())
    ON CONFLICT (alert_id)
    DO UPDATE SET status = EXCLUDED.status, assignee = EXCLUDED.assignee, note = EXCLUDED.note, updated_at = NOW()
  `;

  await sql`
    INSERT INTO admin_audit_logs (actor, action, details)
    VALUES ('admin', 'update_alert_case', ${`alert:${alertId},status:${status}`})
  `;

  return NextResponse.json({ ok: true });
}
