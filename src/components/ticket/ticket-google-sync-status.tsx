"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function TicketGoogleSyncStatus({
  connected,
  syncStatus,
  isAssignee,
  hasDueDate,
}: {
  connected: boolean;
  syncStatus: "SYNCED" | "PENDING" | "ERROR" | "DELETED" | null;
  isAssignee: boolean;
  hasDueDate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isAssignee || !hasDueDate) return null;

  let label = "Not synced yet";
  if (!connected) label = "Connect Google Calendar in Settings to sync";
  else if (syncStatus === "SYNCED") label = "Synced to Google Calendar";
  else if (syncStatus === "ERROR") label = "Sync error";
  else if (syncStatus === "PENDING") label = "Sync pending";
  else if (syncStatus === "DELETED") label = "Not synced yet";

  function syncNow() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/integrations/google-calendar/sync", { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Sync failed.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-muted-foreground">Google sync</span>
        <span className="text-right">{label}</span>
      </div>
      {connected ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={syncNow} disabled={pending}>
            {pending ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
