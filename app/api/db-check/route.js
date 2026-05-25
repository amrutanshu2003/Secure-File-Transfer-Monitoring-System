import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const envPresent = Boolean(process.env.POSTGRES_URL);
    const { rows } = await sql`SELECT NOW() as now`;
    return NextResponse.json({
      ok: true,
      env_present: envPresent,
      db_time: rows?.[0]?.now ?? null
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        env_present: Boolean(process.env.POSTGRES_URL),
        error: String(err?.message || err)
      },
      { status: 500 }
    );
  }
}
