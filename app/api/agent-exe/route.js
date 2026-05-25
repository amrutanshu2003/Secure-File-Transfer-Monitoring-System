import { NextResponse } from "next/server";
import { getActiveAgentBinaryMeta, saveAgentBinary } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const meta = await getActiveAgentBinaryMeta();
  return NextResponse.json({ ok: true, binary: meta });
}

export async function POST(request) {
  const adminKey = process.env.AGENT_UPLOAD_KEY;
  if (!adminKey) {
    return NextResponse.json({ ok: false, error: "AGENT_UPLOAD_KEY not configured" }, { status: 500 });
  }

  const providedKey = request.headers.get("x-agent-upload-key") || "";
  if (providedKey !== adminKey) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const fileName = body.file_name || "SFTMSAgentSetup.exe";
  const version = body.version || "1.0.0";
  const mimeType = body.mime_type || "application/vnd.microsoft.portable-executable";
  const base64Data = body.base64_data || "";

  if (!base64Data) {
    return NextResponse.json({ ok: false, error: "base64_data is required" }, { status: 400 });
  }

  const fileBuffer = Buffer.from(base64Data, "base64");
  const saved = await saveAgentBinary({
    fileName,
    version,
    mimeType,
    fileData: fileBuffer
  });

  return NextResponse.json({ ok: true, saved });
}
