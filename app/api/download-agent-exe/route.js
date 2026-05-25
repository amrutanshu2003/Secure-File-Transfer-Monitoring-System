import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const directExeUrl = process.env.AGENT_EXE_URL;
  const fallbackUrl = "https://github.com/amrutanshu2003/Secure-File-Transfer-Monitoring-System/actions/workflows/build-agent-installer.yml";
  return NextResponse.redirect(directExeUrl || fallbackUrl, 302);
}
