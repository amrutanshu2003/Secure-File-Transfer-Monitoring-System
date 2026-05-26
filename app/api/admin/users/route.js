import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const { rows } = await sql`SELECT id, username, role, created_at FROM admin_users ORDER BY id ASC`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await initDb();
  const body = await request.json();
  const username = (body.username || "").trim();
  const role = body.role || "viewer";
  if (!username) return NextResponse.json({ ok: false, error: "username required" }, { status: 400 });

  await sql`
    INSERT INTO admin_users (username, role)
    VALUES (${username}, ${role})
    ON CONFLICT (username) DO UPDATE SET role = EXCLUDED.role
  `;
  await sql`INSERT INTO admin_audit_logs (actor, action, details) VALUES ('admin', 'upsert_admin_user', ${username})`;
  return NextResponse.json({ ok: true });
}
