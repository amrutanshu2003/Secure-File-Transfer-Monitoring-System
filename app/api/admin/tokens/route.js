import crypto from "crypto";
import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await initDb();
  const { rows } = await sql`SELECT id, name, token_prefix, is_active, last_used_at, created_at FROM api_tokens ORDER BY id DESC`;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await initDb();
  const body = await request.json();
  const name = body.name || "API Key";
  const token = crypto.randomBytes(20).toString("hex");
  const prefix = token.slice(0, 10);
  await sql`INSERT INTO api_tokens (name, token_prefix, is_active) VALUES (${name}, ${prefix}, TRUE)`;
  await sql`INSERT INTO admin_audit_logs (actor, action, details) VALUES ('admin', 'create_api_token', ${name})`;
  return NextResponse.json({ ok: true, token });
}

export async function PATCH(request) {
  await initDb();
  const body = await request.json();
  const id = Number(body.id || 0);
  const is_active = body.is_active !== false;
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  await sql`UPDATE api_tokens SET is_active = ${is_active} WHERE id = ${id}`;
  await sql`INSERT INTO admin_audit_logs (actor, action, details) VALUES ('admin', 'toggle_api_token', ${`id:${id},active:${is_active}`})`;
  return NextResponse.json({ ok: true });
}
