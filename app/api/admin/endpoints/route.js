import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const { rows } = await sql`
    SELECT endpoint_key, hostname, username, os_name, agent_version, last_seen,
      CASE WHEN last_seen >= NOW() - INTERVAL '2 minutes' THEN 'online' ELSE 'offline' END AS computed_status
    FROM monitored_endpoints
    ORDER BY last_seen DESC
    LIMIT 200
  `;
  return NextResponse.json(rows);
}
