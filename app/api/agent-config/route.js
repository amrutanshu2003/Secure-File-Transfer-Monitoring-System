import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  await initDb();
  const { searchParams } = new URL(request.url);
  const userKey = searchParams.get("userKey") || "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  if (!userKey) {
    return NextResponse.json({ error: "userKey required" }, { status: 400 });
  }

  const { rows } = await sql`
    SELECT folder_path
    FROM monitored_folders
    WHERE user_key = ${userKey}
    ORDER BY id DESC
  `;

  const watchPaths = rows.map((r) => r.folder_path);
  const config = {
    api_base_url: baseUrl || "https://secure-file-transfer-monitoring.vercel.app",
    events_endpoint: "/api/events",
    watch_paths: watchPaths,
    recursive: true,
    ignore_paths: [],
    request_timeout_seconds: 8,
    retry_attempts: 3
  };

  return NextResponse.json(config);
}
