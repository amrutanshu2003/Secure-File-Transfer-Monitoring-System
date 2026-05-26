import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  await initDb();
  await sql`
    TRUNCATE TABLE
      alert_cases,
      alerts,
      file_events,
      monitored_endpoints,
      integrity_baselines
    RESTART IDENTITY CASCADE
  `;
  return NextResponse.json({ ok: true, message: "All monitoring data cleared." });
}
