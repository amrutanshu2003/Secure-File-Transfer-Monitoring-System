import { getActiveAgentBinaryFile } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const file = await getActiveAgentBinaryFile();
  if (!file) {
    return new Response("No EXE stored in database", { status: 404 });
  }

  const fileName = file.file_name || "SFTMSAgentSetup.exe";
  const mimeType = file.mime_type || "application/octet-stream";
  const bytes = file.file_data;

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store"
    }
  });
}
