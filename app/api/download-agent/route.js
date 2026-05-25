import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const url = new URL(request.url);
  return NextResponse.redirect(`${url.protocol}//${url.host}/api/download-agent-exe`, 302);
}
