import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();

  const [dailyEvents, dailyAlerts, violations] = await Promise.all([
    sql`SELECT DATE_TRUNC('day', ts) AS day, COUNT(*)::int AS c FROM file_events GROUP BY day ORDER BY day DESC LIMIT 7`,
    sql`SELECT DATE_TRUNC('day', ts) AS day, COUNT(*)::int AS c FROM alerts GROUP BY day ORDER BY day DESC LIMIT 7`,
    sql`SELECT violation, COUNT(*)::int AS c FROM alerts GROUP BY violation ORDER BY c DESC LIMIT 10`
  ]);

  return NextResponse.json({
    daily_events: dailyEvents.rows,
    daily_alerts: dailyAlerts.rows,
    top_violations: violations.rows
  });
}
