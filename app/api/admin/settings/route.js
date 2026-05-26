import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { initDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const defaults = {
  timezone: "Asia/Kolkata",
  retention_days: 90,
  notification_channels: ["email"],
  webhook_url: ""
};

export async function GET() {
  await initDb();
  const { rows } = await sql`SELECT setting_value FROM app_settings WHERE setting_key = 'global' LIMIT 1`;
  return NextResponse.json(rows[0]?.setting_value || defaults);
}

export async function POST(request) {
  await initDb();
  const body = await request.json();
  const value = {
    timezone: body.timezone || "Asia/Kolkata",
    retention_days: Number(body.retention_days || 90),
    notification_channels: Array.isArray(body.notification_channels) ? body.notification_channels : ["email"],
    webhook_url: body.webhook_url || ""
  };

  await sql`
    INSERT INTO app_settings (setting_key, setting_value, updated_at)
    VALUES ('global', ${JSON.stringify(value)}::jsonb, NOW())
    ON CONFLICT (setting_key)
    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
  `;

  await sql`INSERT INTO admin_audit_logs (actor, action, details) VALUES ('admin', 'update_settings', 'global')`;
  return NextResponse.json({ ok: true });
}
