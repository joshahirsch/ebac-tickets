import { requireUser } from "@/lib/auth";
import { getGoogleCalendarConnectionView } from "@/server/queries/google-calendar";
import { GoogleCalendarIntegrationCard } from "@/components/settings/google-calendar-integration-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Google Calendar is not configured on this server.",
  oauth_denied: "Google authorization was cancelled.",
  missing_code: "Google did not return an authorization code.",
  invalid_state: "The Google authorization link expired. Please try again.",
  token_exchange: "Could not complete Google authorization.",
  missing_refresh: "Google did not return a refresh token. Try disconnecting in Google Account settings and reconnect.",
  callback_failed: "Could not save the Google Calendar connection.",
};

type SP = Promise<Record<string, string | string[] | undefined>>;

function first(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function IntegrationsSettingsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const connection = await getGoogleCalendarConnectionView(user.id);
  const errorKey = first(sp, "error");
  const connected = first(sp, "connected");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Connect personal tools. Sync only affects tickets assigned to you.
        </p>
      </div>

      {connected ? (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Google Calendar connected. Use Sync now to push your assigned due-date tickets.
        </p>
      ) : null}
      {errorKey && ERROR_MESSAGES[errorKey] ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {ERROR_MESSAGES[errorKey]}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Google Calendar</CardTitle>
          <CardDescription>
            One-way sync of your assigned tickets with due dates to your personal primary calendar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleCalendarIntegrationCard connection={connection} />
        </CardContent>
      </Card>
    </div>
  );
}
