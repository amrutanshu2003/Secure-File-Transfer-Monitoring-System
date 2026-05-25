import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const userKey = searchParams.get("userKey") || "";
  if (!userKey) return NextResponse.json([]);

  const { rows } = await sql`
    SELECT id, folder_path
    FROM monitored_folders
    WHERE user_key = ${userKey}
    ORDER BY id DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(request) {
  await initDb();
  const body = await request.json();
  const userKey = (body.userKey || "").trim();
  const folderPath = (body.folder_path || "").trim();
  if (!userKey || !folderPath) {
    return NextResponse.json({ ok: false, error: "userKey and folder_path required" }, { status: 400 });
  }

  await sql`
    INSERT INTO monitored_folders (user_key, folder_path)
    VALUES (${userKey}, ${folderPath})
    ON CONFLICT (user_key, folder_path) DO NOTHING
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  await initDb();
  const body = await request.json();
  const userKey = (body.userKey || "").trim();
  const id = Number(body.id || 0);
  if (!userKey || !id) {
    return NextResponse.json({ ok: false, error: "userKey and id required" }, { status: 400 });
  }

  await sql`
    DELETE FROM monitored_folders
    WHERE user_key = ${userKey} AND id = ${id}
  `;
  return NextResponse.json({ ok: true });
}
