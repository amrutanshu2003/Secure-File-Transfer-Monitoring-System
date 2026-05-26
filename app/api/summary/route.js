import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");
  const hasSince = Boolean(since);

  const totalEvents = hasSince
    ? await sql`SELECT COUNT(*)::int AS c FROM file_events WHERE ts >= ${since}::timestamptz`
    : await sql`SELECT COUNT(*)::int AS c FROM file_events`;

  const totalAlerts = hasSince
    ? await sql`SELECT COUNT(*)::int AS c FROM alerts WHERE ts >= ${since}::timestamptz`
    : await sql`SELECT COUNT(*)::int AS c FROM alerts`;

  const counts = hasSince
    ? await sql`
      SELECT action_type, COUNT(*)::int AS c
      FROM file_events
      WHERE ts >= ${since}::timestamptz
      GROUP BY action_type
      ORDER BY c DESC
    `
    : await sql`
      SELECT action_type, COUNT(*)::int AS c
      FROM file_events
      GROUP BY action_type
      ORDER BY c DESC
    `;

  return NextResponse.json({
    total_events: totalEvents.rows[0].c,
    total_alerts: totalAlerts.rows[0].c,
    event_type_counts: counts.rows
  });
}
