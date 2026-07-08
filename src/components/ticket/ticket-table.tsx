"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format, isPast } from "date-fns";
import { Archive, ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import type { TicketStatus, TicketPriority, TicketType } from "@prisma/client";
import {
  archiveTicketAction,
  bulkArchiveTicketsAction,
  reopenTicketAction,
} from "@/server/actions/tickets";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { TypeBadge } from "@/components/type-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
type TicketLabel = { labelId: string; label: { id: string; name: string; color: string } };

export type TicketTableItem = {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: TicketType;
  isArchived: boolean;
  dueDate: string | null;
  updatedAt: string;
  project: { key: string; name: string };
  assignee: { id: string; name: string | null; email: string } | null;
  labels: TicketLabel[];
};

function buildSortHref(
  searchParams: URLSearchParams,
  field: string,
  currentSort: string,
): string {
  const next = new URLSearchParams(searchParams.toString());
  const [curField, curDir] = (currentSort || "updatedAt:desc").split(":");
  next.delete("sort");
  const dir = curField === field && curDir === "asc" ? "desc" : "asc";
  next.set("sort", `${field}:${dir}`);
  return `/tickets?${next.toString()}`;
}

const COLUMNS: Array<{ field: string; label: string; sortable: boolean; className?: string }> = [
  { field: "title", label: "Title", sortable: true },
  { field: "project", label: "Project", sortable: false, className: "hidden md:table-cell" },
  { field: "type", label: "Type", sortable: false, className: "hidden lg:table-cell" },
  { field: "status", label: "Status", sortable: true },
  { field: "priority", label: "Priority", sortable: true, className: "hidden sm:table-cell" },
  { field: "assignee", label: "Assignee", sortable: false, className: "hidden lg:table-cell" },
  { field: "dueDate", label: "Due", sortable: true, className: "hidden sm:table-cell" },
  { field: "updatedAt", label: "Updated", sortable: true, className: "hidden xl:table-cell" },
];

type Toast = { message: string; variant: "success" | "error" };
type ConfirmState =
  | { kind: "single-archive"; ticketId: string }
  | { kind: "single-reopen"; ticketId: string }
  | { kind: "bulk-archive"; ticketIds: string[] }
  | null;

function TableToast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.message]);

  return (
    <div
      role="status"
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm rounded-md border px-4 py-3 text-sm shadow-lg",
        toast.variant === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900",
      )}
    >
      {toast.message}
    </div>
  );
}

export function TicketTable({
  tickets,
  currentSort,
  canArchive,
  viewingArchived,
}: {
  tickets: TicketTableItem[];
  currentSort: string;
  canArchive: boolean;
  viewingArchived: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortHref = useCallback(
    (field: string) => buildSortHref(searchParams, field, currentSort),
    [searchParams, currentSort],
  );
  const [visibleTickets, setVisibleTickets] = useState(tickets);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setVisibleTickets(tickets);
    setSelected(new Set());
  }, [tickets]);

  const [sortField, sortDir] = (currentSort || "updatedAt:desc").split(":");

  const selectableIds = useMemo(
    () =>
      visibleTickets
        .filter((t) => (viewingArchived ? t.isArchived : !t.isArchived))
        .map((t) => t.id),
    [visibleTickets, viewingArchived],
  );

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selectableIds.some((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showToast = useCallback((message: string, variant: Toast["variant"]) => {
    setToast({ message, variant });
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const runConfirmed = () => {
    if (!confirm) return;
    const state = confirm;
    setConfirm(null);

    startTransition(async () => {
      if (state.kind === "single-archive") {
        const res = await archiveTicketAction(state.ticketId);
        if (res.ok) {
          if (!viewingArchived) {
            setVisibleTickets((prev) => prev.filter((t) => t.id !== state.ticketId));
          }
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(state.ticketId);
            return next;
          });
          showToast("Ticket archived.", "success");
          router.refresh();
        } else {
          showToast(res.error ?? "Failed to archive ticket.", "error");
        }
        return;
      }

      if (state.kind === "single-reopen") {
        const res = await reopenTicketAction(state.ticketId);
        if (res.ok) {
          if (viewingArchived) {
            setVisibleTickets((prev) => prev.filter((t) => t.id !== state.ticketId));
          }
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(state.ticketId);
            return next;
          });
          showToast("Ticket restored.", "success");
          router.refresh();
        } else {
          showToast(res.error ?? "Failed to restore ticket.", "error");
        }
        return;
      }

      const res = await bulkArchiveTicketsAction(state.ticketIds);
      if (res.ok) {
        const archivedIds = new Set(state.ticketIds);
        if (!viewingArchived) {
          setVisibleTickets((prev) => prev.filter((t) => !archivedIds.has(t.id)));
        }
        setSelected(new Set());
        const count = res.archivedCount ?? state.ticketIds.length;
        showToast(
          res.skippedCount
            ? `${count} ticket${count === 1 ? "" : "s"} archived. ${res.skippedCount} skipped.`
            : `${count} ticket${count === 1 ? "" : "s"} archived.`,
          "success",
        );
        router.refresh();
      } else {
        showToast(res.error ?? "Failed to archive tickets.", "error");
      }
    });
  };

  const selectedArchiveIds = useMemo(
    () => [...selected].filter((id) => visibleTickets.some((t) => t.id === id && !t.isArchived)),
    [selected, visibleTickets],
  );

  if (visibleTickets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">No tickets match these filters.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try clearing filters, or create a new ticket.
        </p>
      </div>
    );
  }

  const confirmTitle =
    confirm?.kind === "bulk-archive"
      ? `Archive ${confirm.ticketIds.length} selected tickets?`
      : confirm?.kind === "single-reopen"
        ? "Restore this ticket?"
        : "Archive this ticket?";

  const confirmDescription =
    confirm?.kind === "single-reopen"
      ? "It will return to the default ticket list with status To Do."
      : confirm?.kind === "bulk-archive"
        ? "They will be hidden from the default ticket list but can still be viewed from Show archived."
        : "It will be hidden from the default ticket list but can still be viewed from Show archived.";

  return (
    <>
      <div className="rounded-lg border bg-card">
        {canArchive && selectedArchiveIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-2">
            <span className="text-sm text-muted-foreground">
              {selectedArchiveIds.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                setConfirm({ kind: "bulk-archive", ticketIds: selectedArchiveIds })
              }
            >
              <Archive className="h-4 w-4" />
              Archive selected
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow>
              {canArchive ? (
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    role="checkbox"
                    aria-label="Select all visible tickets"
                    className="accent-primary"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleAll}
                    disabled={pending || selectableIds.length === 0}
                  />
                </TableHead>
              ) : null}
              {COLUMNS.map((col) => (
                <TableHead key={col.field} className={col.className}>
                  {col.sortable ? (
                    <Link
                      href={sortHref(col.field)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.label}
                      {sortField === col.field ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : null}
                    </Link>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
              {canArchive ? (
                <TableHead className="w-12 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTickets.map((t) => {
              const dueDate = t.dueDate ? new Date(t.dueDate) : null;
              const updatedAt = new Date(t.updatedAt);
              const overdue =
                dueDate && isPast(dueDate) && t.status !== "DONE" && t.status !== "ARCHIVED";
              const rowSelectable = viewingArchived ? t.isArchived : !t.isArchived;

              return (
                <TableRow key={t.id}>
                  {canArchive ? (
                    <TableCell>
                      {rowSelectable ? (
                        <input
                          type="checkbox"
                          role="checkbox"
                          aria-label={`Select ${t.project.key}-${t.number}`}
                          className="accent-primary"
                          checked={selected.has(t.id)}
                          onChange={() => toggleOne(t.id)}
                          disabled={pending}
                        />
                      ) : null}
                    </TableCell>
                  ) : null}
                  <TableCell className="max-w-[380px]">
                    <Link href={`/tickets/${t.id}`} className="block">
                      <span className="text-xs text-muted-foreground">
                        {t.project.key}-{t.number}
                      </span>
                      <span className="ml-1 font-medium hover:underline">{t.title}</span>
                      {t.labels.length > 0 ? (
                        <span className="ml-2 inline-flex gap-1">
                          {t.labels.map((l) => (
                            <span
                              key={l.labelId}
                              className="rounded-full border px-1.5 text-[10px]"
                              style={{ borderColor: l.label.color, color: l.label.color }}
                            >
                              {l.label.name}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {t.project.key}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <TypeBadge type={t.type} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <PriorityBadge priority={t.priority} />
                  </TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">
                    {t.assignee ? (t.assignee.name ?? t.assignee.email) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell
                    className={cn("hidden text-sm sm:table-cell", overdue && "font-medium text-red-600")}
                  >
                    {dueDate ? format(dueDate, "MMM d") : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                    {format(updatedAt, "MMM d")}
                  </TableCell>
                  {canArchive ? (
                    <TableCell className="text-right">
                      {t.isArchived ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={pending}
                          aria-label="Restore ticket"
                          title="Restore"
                          onClick={() => setConfirm({ kind: "single-reopen", ticketId: t.id })}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={pending}
                          aria-label="Archive ticket"
                          title="Archive"
                          onClick={() => setConfirm({ kind: "single-archive", ticketId: t.id })}
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(open) => !open && !pending && setConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>{confirmDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button disabled={pending} onClick={runConfirmed}>
              {pending
                ? "Working…"
                : confirm?.kind === "single-reopen"
                  ? "Restore"
                  : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast ? <TableToast toast={toast} onDismiss={dismissToast} /> : null}
    </>
  );
}
