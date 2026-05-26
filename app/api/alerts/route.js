import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50000), 50000);
  const offset = Math.max(Number(searchParams.get("offset") || 0), 0);
  const { rows } = await sql`
    SELECT a.id, a.ts, a.severity, a.message, a.violation, e.file_name, e.username
    FROM alerts a
    LEFT JOIN file_events e ON e.id = a.event_id
    ORDER BY a.id DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;
  return NextResponse.json(rows);
}
