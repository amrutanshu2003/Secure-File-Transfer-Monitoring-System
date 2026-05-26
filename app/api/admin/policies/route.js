import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const { rows } = await sql`SELECT id, name, rule_type, pattern, enabled, created_at FROM security_policies ORDER BY id DESC`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await initDb();
  const body = await request.json();
  const name = body.name || "New policy";
  const rule_type = body.rule_type || "destination";
  const pattern = body.pattern || "";
  const enabled = body.enabled !== false;

  const { rows } = await sql`
    INSERT INTO security_policies (name, rule_type, pattern, enabled)
    VALUES (${name}, ${rule_type}, ${pattern}, ${enabled})
    RETURNING id
  `;

  await sql`INSERT INTO admin_audit_logs (actor, action, details) VALUES ('admin', 'create_policy', ${name})`;
  return NextResponse.json({ ok: true, id: rows[0].id });
}

export async function DELETE(request) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id") || 0);
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  await sql`DELETE FROM security_policies WHERE id = ${id}`;
  await sql`INSERT INTO admin_audit_logs (actor, action, details) VALUES ('admin', 'delete_policy', ${`id:${id}`})`;
  return NextResponse.json({ ok: true });
}
