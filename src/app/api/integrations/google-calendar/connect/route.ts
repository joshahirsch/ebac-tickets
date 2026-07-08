import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  buildGoogleAuthorizeUrl,
  buildOAuthState,
  isGoogleCalendarConfigured,
  requireGoogleOAuthConfig,
} from "@/lib/integrations/google-calendar/oauth";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", _request.url));
  }

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=not_configured", _request.url),
    );
  }

  try {
    const config = requireGoogleOAuthConfig();
    const state = buildOAuthState(user.id);
    const url = buildGoogleAuthorizeUrl({
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      state,
    });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(
      new URL("/settings/integrations?error=not_configured", _request.url),
    );
  }
}
