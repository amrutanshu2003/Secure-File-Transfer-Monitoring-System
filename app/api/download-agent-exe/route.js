import { NextResponse } from "next/server";
import { getActiveAgentBinaryMeta } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const hardcodedArtifactUrl = "https://github.com/amrutanshu2003/Secure-File-Transfer-Monitoring-System/actions/runs/26400980783/artifacts/7198337545";
  return NextResponse.redirect(hardcodedArtifactUrl, 302);

  const dbBinary = await getActiveAgentBinaryMeta();
  if (dbBinary) {
    const requestUrl = new URL(request.url);
    const dbDownloadUrl = new URL("/api/agent-exe/download", requestUrl.origin).toString();
    return NextResponse.redirect(dbDownloadUrl, 302);
  }

  const directExeUrl = process.env.AGENT_EXE_URL;
  const requestUrl = new URL(request.url);
  const fallbackUrl = new URL("/downloads/SFTMSAgentSetup.exe", requestUrl.origin).toString();
  return NextResponse.redirect(directExeUrl || fallbackUrl, 302);
}
