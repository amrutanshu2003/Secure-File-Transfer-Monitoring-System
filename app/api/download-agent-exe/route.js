import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const directExeUrl = process.env.AGENT_EXE_URL;
  const requestUrl = new URL(request.url);
  const fallbackUrl = new URL("/downloads/SFTMSAgentSetup.exe", requestUrl.origin).toString();
  return NextResponse.redirect(directExeUrl || fallbackUrl, 302);
}
