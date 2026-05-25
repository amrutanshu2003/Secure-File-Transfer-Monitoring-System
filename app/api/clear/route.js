import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  await initDb();
  await sql`DELETE FROM alerts`;
  await sql`DELETE FROM file_events`;
  return NextResponse.json({ ok: true });
}
