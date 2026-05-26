import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  await initDb();

  const [events, alerts, endpoints, openAlerts, sev, topViolations, actions24h] = await Promise.all([
    sql`SELECT COUNT(*)::int AS c FROM file_events`,
    sql`SELECT COUNT(*)::int AS c FROM alerts`,
    sql`SELECT COUNT(*)::int AS c FROM monitored_endpoints`,
    sql`
      SELECT COUNT(*)::int AS c
      FROM alerts a
      LEFT JOIN alert_cases c ON c.alert_id = a.id
      WHERE COALESCE(c.status, 'open') <> 'resolved'
    `,
    sql`SELECT severity, COUNT(*)::int AS c FROM alerts GROUP BY severity ORDER BY c DESC`,
    sql`SELECT violation, COUNT(*)::int AS c FROM alerts GROUP BY violation ORDER BY c DESC LIMIT 5`,
    sql`SELECT action_type, COUNT(*)::int AS c FROM file_events WHERE ts >= NOW() - INTERVAL '24 hours' GROUP BY action_type ORDER BY c DESC`
  ]);

  return NextResponse.json({
    totals: {
      events: events.rows[0]?.c || 0,
      alerts: alerts.rows[0]?.c || 0,
      endpoints: endpoints.rows[0]?.c || 0,
      open_alerts: openAlerts.rows[0]?.c || 0
    },
    severity_breakdown: sev.rows,
    top_violations: topViolations.rows,
    actions_24h: actions24h.rows
  });
}
