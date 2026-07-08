import { createHmac, timingSafeEqual } from "node:crypto";
import {
  GOOGLE_CALENDAR_SCOPES,
  GoogleCalendarConfigError,
  type GoogleOAuthTokens,
} from "./types";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/integrations/google-calendar/callback`;

  return { clientId, clientSecret, redirectUri };
}

export function requireGoogleOAuthConfig(): GoogleOAuthConfig {
  const cfg = getGoogleOAuthConfig();
  if (!cfg) {
    throw new GoogleCalendarConfigError(
      "Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }
  if (!process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim()) {
    throw new GoogleCalendarConfigError(
      "GOOGLE_TOKEN_ENCRYPTION_KEY is not configured.",
    );
  }
  return cfg;
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(getGoogleOAuthConfig() && process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim());
}

function stateSecret(): string {
  return (
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "dev-google-calendar-state"
  );
}

/** Signed state: `userId:timestamp:signature` */
export function buildOAuthState(userId: string, now = Date.now()): string {
  const ts = String(now);
  const payload = `${userId}:${ts}`;
  const sig = createHmac("sha256", stateSecret()).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function parseAndValidateOAuthState(
  state: string,
  expectedUserId: string,
  maxAgeMs = 15 * 60 * 1000,
): { ok: true } | { ok: false; error: string } {
  const parts = state.split(":");
  if (parts.length !== 3) return { ok: false, error: "Invalid OAuth state." };
  const [userId, ts, sig] = parts;
  if (!userId || !ts || !sig) return { ok: false, error: "Invalid OAuth state." };
  if (userId !== expectedUserId) return { ok: false, error: "OAuth state user mismatch." };

  const payload = `${userId}:${ts}`;
  const expected = createHmac("sha256", stateSecret()).update(payload).digest("hex");
  try {
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "OAuth state signature invalid." };
    }
  } catch {
    return { ok: false, error: "OAuth state signature invalid." };
  }

  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) {
    return { ok: false, error: "OAuth state expired." };
  }
  return { ok: true };
}

export function buildGoogleAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
}): string {
  const scopes = (params.scopes ?? GOOGLE_CALENDAR_SCOPES).join(" ");
  const qs = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: params.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${qs.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  config: GoogleOAuthConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleOAuthTokens> {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error("Failed to exchange Google authorization code.");
  }
  return (await res.json()) as GoogleOAuthTokens;
}

export async function refreshAccessToken(
  refreshToken: string,
  config: GoogleOAuthConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleOAuthTokens> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error("Failed to refresh Google access token.");
  }
  return (await res.json()) as GoogleOAuthTokens;
}

export async function fetchGoogleAccountEmail(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const res = await fetchImpl("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

export async function revokeGoogleToken(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  await fetchImpl(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }).catch(() => undefined);
}
