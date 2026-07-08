import { NextResponse, type NextRequest } from "next/server";
import { generateDueSoonNotifications } from "@/server/notifications";

export const dynamic = "force-dynamic";

/**
 * Scheduled endpoint that generates "due soon" notifications.
 *
 * Protect with CRON_SECRET: callers must send `Authorization: Bearer <secret>`.
 * Vercel Cron can be configured to hit this (see vercel.json). If CRON_SECRET
 * is unset, the route refuses to run rather than exposing an open endpoint.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured." }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const provided = auth?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const created = await generateDueSoonNotifications();
  return NextResponse.json({ ok: true, created });
}
