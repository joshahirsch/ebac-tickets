"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TicketStatus } from "@prisma/client";
import type { TicketListItem } from "@/server/queries/tickets";
import { updateTicketAction } from "@/server/actions/tickets";
import { TICKET_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { TicketCard } from "@/components/ticket/ticket-card";

// Board columns: everything except ARCHIVED.
const COLUMNS: TicketStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "DONE"];

function group(tickets: TicketListItem[]): Record<TicketStatus, TicketListItem[]> {
  const base = Object.fromEntries(COLUMNS.map((c) => [c, [] as TicketListItem[]])) as Record<
    TicketStatus,
    TicketListItem[]
  >;
  for (const t of tickets) {
    if (base[t.status]) base[t.status].push(t);
  }
  return base;
}

export function KanbanBoard({
  tickets,
  canEdit,
}: {
  tickets: TicketListItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState(() => group(tickets));
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TicketStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Re-sync when server data changes (e.g. after refresh or filter change).
  const signature = useMemo(() => tickets.map((t) => `${t.id}:${t.status}`).join(","), [tickets]);
  useEffect(() => {
    setColumns(group(tickets));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const move = (ticketId: string, to: TicketStatus) => {
    const from = (Object.keys(columns) as TicketStatus[]).find((c) =>
      columns[c].some((t) => t.id === ticketId),
    );
    if (!from || from === to) return;

    const ticket = columns[from].find((t) => t.id === ticketId);
    if (!ticket) return;

    // Optimistic update.
    setColumns((prev) => ({
      ...prev,
      [from]: prev[from].filter((t) => t.id !== ticketId),
      [to]: [{ ...ticket, status: to }, ...prev[to]],
    }));
    setError(null);

    startTransition(async () => {
      const res = await updateTicketAction({ id: ticketId, status: to } as never);
      if (!res.ok) {
        setError(res.error ?? "Move failed.");
        setColumns(group(tickets)); // revert
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((status) => {
          const meta = TICKET_STATUS_META[status];
          const items = columns[status];
          return (
            <div
              key={status}
              onDragOver={(e) => {
                if (!canEdit || !dragId) return;
                e.preventDefault();
                setDragOver(status);
              }}
              onDragLeave={() => setDragOver((s) => (s === status ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                if (canEdit && dragId) move(dragId, status);
                setDragId(null);
                setDragOver(null);
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors",
                dragOver === status && "border-primary bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between px-3 py-2">
                <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", meta.badge)}>
                  {meta.label}
                </span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="flex-1 space-y-2 px-2 pb-2">
                {items.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">Empty</p>
                ) : (
                  items.map((t) => (
                    <div
                      key={t.id}
                      draggable={canEdit}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOver(null);
                      }}
                      className={cn(canEdit && "cursor-grab active:cursor-grabbing", dragId === t.id && "opacity-50")}
                    >
                      <TicketCard ticket={t} />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      {canEdit ? (
        <p className="text-xs text-muted-foreground">Drag a card to another column to change its status.</p>
      ) : null}
    </div>
  );
}
