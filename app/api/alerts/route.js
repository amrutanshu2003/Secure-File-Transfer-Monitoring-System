import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export async function GET() {
  await initDb();
  const { rows } = await sql`
    SELECT a.id, a.ts, a.severity, a.message, a.violation, e.file_name, e.username
    FROM alerts a
    LEFT JOIN file_events e ON e.id = a.event_id
    ORDER BY a.id DESC
    LIMIT 100
  `;
  return NextResponse.json(rows);
}
