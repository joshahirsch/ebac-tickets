"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { GoogleCalendarConnectionView } from "@/server/queries/google-calendar";
import type { SyncResultStatus, SyncTicketFailure } from "@/lib/integrations/google-calendar/sync-errors";

type SyncResult = {
  ok: boolean;
  status?: SyncResultStatus;
  error?: string;
  created?: number;
  updated?: number;
  deleted?: number;
  skipped?: number;
  errors?: number;
  failures?: SyncTicketFailure[];
  reconnectRequired?: boolean;
};

export function GoogleCalendarIntegrationCard({
  connection,
}: {
  connection: GoogleCalendarConnectionView;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [syncFeedback, setSyncFeedback] = useState<{
    status: SyncResultStatus;
    message: string;
    failures: SyncTicketFailure[];
    reconnectRequired: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function disconnect() {
    setSyncFeedback(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/integrations/google-calendar/disconnect", {
        method: "POST",
      });
      if (!res.ok) {
        setError("Could not disconnect Google Calendar.");
        return;
      }
      setSyncFeedback({
        status: "SUCCESS",
        message: "Google Calendar disconnected.",
        failures: [],
        reconnectRequired: false,
      });
      router.refresh();
    });
  }

  async function syncNow() {
    setSyncFeedback(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/integrations/google-calendar/sync", {
        method: "POST",
      });
      const data = (await res.json()) as SyncResult;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Sync failed.");
        if (data.failures?.length) {
          setSyncFeedback({
            status: data.status ?? "ERROR",
            message: formatSyncMessage(data),
            failures: data.failures,
            reconnectRequired: Boolean(data.reconnectRequired),
          });
        }
        router.refresh();
        return;
      }

      setSyncFeedback({
        status: data.status ?? (data.errors ? "PARTIAL" : "SUCCESS"),
        message: formatSyncMessage(data),
        failures: data.failures ?? [],
        reconnectRequired: Boolean(data.reconnectRequired),
      });
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
  const persistedFailures = connection.lastSyncErrorDetails?.failures ?? [];

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
              <Row
                label="Last result"
                value={connection.lastSyncStatus}
                valueClassName={statusTextClass(parseStatusFromLabel(connection.lastSyncStatus))}
              />
            ) : null}
            {connection.lastSyncErrorDetails?.summary ? (
              <Row
                label="Error"
                value={connection.lastSyncErrorDetails.summary}
                valueClassName="text-destructive"
              />
            ) : connection.lastSyncError ? (
              <Row label="Error" value={connection.lastSyncError} valueClassName="text-destructive" />
            ) : null}
          </dl>

          {persistedFailures.length > 0 ? (
            <SyncFailureDetails
              failures={persistedFailures}
              reconnectRequired={connection.lastSyncErrorDetails?.reconnectRequired}
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={syncNow} disabled={pending}>
              {pending ? "Working…" : "Sync now"}
            </Button>
            <Button type="button" variant="outline" onClick={disconnect} disabled={pending}>
              Disconnect
            </Button>
            {connection.status === "ERROR" || connection.lastSyncErrorDetails?.reconnectRequired ? (
              <Button asChild variant="secondary">
                <a href="/api/integrations/google-calendar/connect">Reconnect</a>
              </Button>
            ) : null}
          </div>
        </>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {syncFeedback ? (
        <div className="space-y-2">
          <p className={`text-sm ${statusTextClass(syncFeedback.status)}`}>{syncFeedback.message}</p>
          {syncFeedback.reconnectRequired ? (
            <p className="text-sm text-destructive">
              Reconnect Google Calendar to restore write permissions.
            </p>
          ) : null}
          {syncFeedback.failures.length > 0 ? (
            <SyncFailureDetails
              failures={syncFeedback.failures}
              reconnectRequired={syncFeedback.reconnectRequired}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SyncFailureDetails({
  failures,
  reconnectRequired,
}: {
  failures: SyncTicketFailure[];
  reconnectRequired?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const preview = failures.slice(0, 3);

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
      <button
        type="button"
        className="font-medium underline-offset-2 hover:underline"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide" : "Show"} sync failure details ({failures.length})
      </button>
      <ul className="mt-2 space-y-2">
        {(open ? failures : preview).map((failure) => (
          <li key={`${failure.ticketId}-${failure.operation}`}>
            <div className="font-medium">
              {failure.ticketKey}: {failure.title}
            </div>
            <div>
              {failure.operation} failed
              {failure.status ? ` (${failure.status})` : ""}
              {failure.reason ? ` — ${failure.reason}` : ""}
            </div>
            <div className="text-amber-900">{failure.message}</div>
          </li>
        ))}
      </ul>
      {!open && failures.length > preview.length ? (
        <p className="mt-2 text-amber-900">…and {failures.length - preview.length} more.</p>
      ) : null}
      {reconnectRequired ? (
        <p className="mt-2 text-destructive">Reconnect required before sync can succeed.</p>
      ) : null}
    </div>
  );
}

function formatSyncMessage(data: SyncResult): string {
  const status = data.status ?? (data.errors ? "PARTIAL" : "SUCCESS");
  return `${status}: ${data.created ?? 0} created, ${data.updated ?? 0} updated, ${data.deleted ?? 0} deleted, ${data.skipped ?? 0} skipped, ${data.errors ?? 0} errors`;
}

function parseStatusFromLabel(label: string): SyncResultStatus {
  if (label.startsWith("ERROR:")) return "ERROR";
  if (label.startsWith("PARTIAL:")) return "PARTIAL";
  return "SUCCESS";
}

function statusTextClass(status: SyncResultStatus): string {
  if (status === "ERROR") return "text-destructive";
  if (status === "PARTIAL") return "text-amber-700";
  return "text-green-700";
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right ${valueClassName ?? ""}`}>{value}</dd>
    </div>
  );
}

function formatSyncTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}
