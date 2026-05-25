import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const userKey = searchParams.get("userKey");
  if (!userKey) {
    return NextResponse.json({ theme: "dark", last_username: "" });
  }

  const { rows } = await sql`
    SELECT theme, last_username
    FROM user_preferences
    WHERE user_key = ${userKey}
    LIMIT 1
  `;

  if (!rows.length) {
    return NextResponse.json({ theme: "dark", last_username: "" });
  }
  return NextResponse.json(rows[0]);
}

export async function POST(request) {
  await initDb();
  const body = await request.json();
  const userKey = body.userKey || "";
  const theme = body.theme || "dark";
  const lastUsername = body.last_username || "";

  if (!userKey) {
    return NextResponse.json({ ok: false, error: "userKey required" }, { status: 400 });
  }

  await sql`
    INSERT INTO user_preferences (user_key, theme, last_username, updated_at)
    VALUES (${userKey}, ${theme}, ${lastUsername}, NOW())
    ON CONFLICT (user_key)
    DO UPDATE SET
      theme = EXCLUDED.theme,
      last_username = EXCLUDED.last_username,
      updated_at = NOW()
  `;

  return NextResponse.json({ ok: true });
}
