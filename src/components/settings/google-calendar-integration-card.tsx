"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { GoogleCalendarConnectionView } from "@/server/queries/google-calendar";

type SyncResult = {
  ok: boolean;
  error?: string;
  created?: number;
  updated?: number;
  deleted?: number;
  skipped?: number;
  errors?: number;
};

export function GoogleCalendarIntegrationCard({
  connection,
}: {
  connection: GoogleCalendarConnectionView;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/integrations/google-calendar/disconnect", {
        method: "POST",
      });
      if (!res.ok) {
        setError("Could not disconnect Google Calendar.");
        return;
      }
      setMessage("Google Calendar disconnected.");
      router.refresh();
    });
  }

  async function syncNow() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/integrations/google-calendar/sync", {
        method: "POST",
      });
      const data = (await res.json()) as SyncResult;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Sync failed.");
        router.refresh();
        return;
      }
      setMessage(
        `Synced: ${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.deleted ?? 0} removed, ${data.skipped ?? 0} unchanged.`,
      );
      router.refresh();
    });
  }

  if (!connection.configured) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Google Calendar is not configured for this environment. An administrator must set{" "}
          <code className="text-xs">GOOGLE_CLIENT_ID</code>,{" "}
          <code className="text-xs">GOOGLE_CLIENT_SECRET</code>, and{" "}
          <code className="text-xs">GOOGLE_TOKEN_ENCRYPTION_KEY</code>.
        </p>
      </div>
    );
  }

  const isConnected = connection.status === "CONNECTED" || connection.status === "ERROR";

  return (
    <div className="space-y-4 text-sm">
      {!isConnected ? (
        <>
          <p className="text-muted-foreground">
            Connect your personal Google Calendar to sync tickets assigned to you that have due
            dates. Sync is one-way from EBAC Projects to your primary calendar.
          </p>
          <Button asChild>
            <a href="/api/integrations/google-calendar/connect">Connect Google Calendar</a>
          </Button>
        </>
      ) : (
        <>
          <dl className="space-y-2">
            <Row label="Account" value={connection.googleAccountEmail ?? "Connected"} />
            <Row label="Calendar" value="Primary calendar" />
            <Row
              label="Status"
              value={
                connection.status === "ERROR"
                  ? "Needs attention"
                  : "Connected"
              }
            />
            <Row
              label="Last sync"
              value={
                connection.lastSyncAt
                  ? formatSyncTime(connection.lastSyncAt)
                  : "Not synced yet"
              }
            />
            {connection.lastSyncStatus ? (
              <Row label="Last result" value={connection.lastSyncStatus} />
            ) : null}
            {connection.lastSyncError ? (
              <Row label="Error" value={connection.lastSyncError} />
            ) : null}
          </dl>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={syncNow} disabled={pending}>
              {pending ? "Working…" : "Sync now"}
            </Button>
            <Button type="button" variant="outline" onClick={disconnect} disabled={pending}>
              Disconnect
            </Button>
            {connection.status === "ERROR" ? (
              <Button asChild variant="secondary">
                <a href="/api/integrations/google-calendar/connect">Reconnect</a>
              </Button>
            ) : null}
          </div>
        </>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function formatSyncTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}
