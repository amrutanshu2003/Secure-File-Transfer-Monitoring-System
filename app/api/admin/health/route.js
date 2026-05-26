import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const [dbTime, dbSize, auditCount] = await Promise.all([
    sql`SELECT NOW() AS now`,
    sql`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`,
    sql`SELECT COUNT(*)::int AS c FROM admin_audit_logs`
  ]);

  return NextResponse.json({
    status: "healthy",
    db_time: dbTime.rows[0]?.now,
    db_size: dbSize.rows[0]?.size || "unknown",
    audit_log_entries: auditCount.rows[0]?.c || 0
  });
}
