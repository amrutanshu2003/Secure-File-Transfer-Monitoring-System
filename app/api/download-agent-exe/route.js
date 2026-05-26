export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const artifactUrl = "https://github.com/amrutanshu2003/Secure-File-Transfer-Monitoring-System/actions/runs/26425914937/artifacts/7206814908";
  return Response.redirect(artifactUrl, 302);
}
