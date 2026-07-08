import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { syncUserGoogleCalendar } from "@/lib/integrations/google-calendar/sync";

export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const result = await syncUserGoogleCalendar(user);
  const body = {
    ok: result.ok,
    status: result.status,
    created: result.created,
    updated: result.updated,
    deleted: result.deleted,
    skipped: result.skipped,
    errors: result.errors,
    failures: result.failures,
    reconnectRequired: result.reconnectRequired ?? false,
    error: result.error,
  };

  if (!result.ok) {
    return NextResponse.json(body, { status: 400 });
  }

  return NextResponse.json(body);
}
