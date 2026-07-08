"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateTicketAction } from "@/server/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function TitleEditor({
  ticketId,
  value,
  canEdit,
}: {
  ticketId: string;
  value: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <h1 className="text-xl font-semibold leading-snug">{value}</h1>
        {canEdit ? (
          <button
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
            className="mt-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Edit title"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    );
  }

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateTicketAction({ id: ticketId, title: draft } as never);
      if (!res.ok) setError(res.error ?? "Update failed.");
      else {
        setEditing(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2">
      <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function DescriptionEditor({
  ticketId,
  value,
  canEdit,
}: {
  ticketId: string;
  value: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="group space-y-2">
        {value ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{value}</p>
        ) : (
          <p className="text-sm italic text-muted-foreground">No description.</p>
        )}
        {canEdit ? (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => {
              setDraft(value);
              setEditing(true);
            }}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        ) : null}
      </div>
    );
  }

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateTicketAction({ id: ticketId, description: draft } as never);
      if (!res.ok) setError(res.error ?? "Update failed.");
      else {
        setEditing(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2">
      <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} autoFocus />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
