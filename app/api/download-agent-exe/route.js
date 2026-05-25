export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const artifactUrl = "https://github.com/amrutanshu2003/Secure-File-Transfer-Monitoring-System/actions/runs/26404615456/artifacts/7199710721";
  return Response.redirect(artifactUrl, 302);
}
