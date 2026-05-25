import { NextResponse } from "next/server";
import { isAgentEnabled, setAgentEnabled } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const enabled = await isAgentEnabled();
  return NextResponse.json({ enabled });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);
  await setAgentEnabled(enabled);
  return NextResponse.json({ ok: true, enabled });
}
