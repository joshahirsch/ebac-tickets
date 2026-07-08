import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForTokens,
  fetchGoogleAccountEmail,
  parseAndValidateOAuthState,
  requireGoogleOAuthConfig,
} from "@/lib/integrations/google-calendar/oauth";
import { encryptSecret } from "@/lib/integrations/google-calendar/tokens";

export const dynamic = "force-dynamic";

function redirectToIntegrations(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/settings/integrations", request.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return redirectToIntegrations(request, { error: "oauth_denied" });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return redirectToIntegrations(request, { error: "missing_code" });
  }

  const stateResult = parseAndValidateOAuthState(state, user.id);
  if (!stateResult.ok) {
    return redirectToIntegrations(request, { error: "invalid_state" });
  }

  try {
    const config = requireGoogleOAuthConfig();
    const tokens = await exchangeCodeForTokens(code, config);
    if (!tokens.access_token) {
      return redirectToIntegrations(request, { error: "token_exchange" });
    }

    const email = await fetchGoogleAccountEmail(tokens.access_token);
    const tokenExpiry =
      typeof tokens.expires_in === "number"
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null;

    const existing = await prisma.googleCalendarConnection.findUnique({
      where: { userId: user.id },
    });

    const refreshEncrypted = tokens.refresh_token
      ? encryptSecret(tokens.refresh_token)
      : existing?.refreshTokenEncrypted ?? null;

    if (!refreshEncrypted) {
      // Offline access should return a refresh token on first consent.
      return redirectToIntegrations(request, { error: "missing_refresh" });
    }

    await prisma.googleCalendarConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        googleAccountEmail: email,
        accessTokenEncrypted: encryptSecret(tokens.access_token),
        refreshTokenEncrypted: refreshEncrypted,
        scope: tokens.scope ?? null,
        tokenExpiry,
        calendarId: "primary",
        status: "CONNECTED",
        disconnectedAt: null,
        lastSyncError: null,
      },
      update: {
        googleAccountEmail: email ?? undefined,
        accessTokenEncrypted: encryptSecret(tokens.access_token),
        refreshTokenEncrypted: refreshEncrypted,
        scope: tokens.scope ?? null,
        tokenExpiry,
        status: "CONNECTED",
        disconnectedAt: null,
        lastSyncError: null,
      },
    });

    return redirectToIntegrations(request, { connected: "1" });
  } catch {
    return redirectToIntegrations(request, { error: "callback_failed" });
  }
}
