export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  const directExeUrl = process.env.AGENT_EXE_URL;
  if (directExeUrl) {
    return Response.redirect(directExeUrl, 302);
  }

  const releaseExeUrl = "https://github.com/amrutanshu2003/Secure-File-Transfer-Monitoring-System/releases/download/latest-agent/SFTMSAgentSetup.exe";
  return Response.redirect(releaseExeUrl, 302);
}
