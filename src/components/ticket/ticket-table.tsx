import Link from "next/link";
import { format, isPast } from "date-fns";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { TicketListItem } from "@/server/queries/tickets";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { TypeBadge } from "@/components/type-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

export function TicketTable({
  tickets,
  currentSort,
  sortHref,
}: {
  tickets: TicketListItem[];
  currentSort: string;
  sortHref: (field: string) => string;
}) {
  const [sortField, sortDir] = (currentSort || "updatedAt:desc").split(":");

  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm font-medium">No tickets match these filters.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try clearing filters, or create a new ticket.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((col) => (
              <TableHead key={col.field} className={col.className}>
                {col.sortable ? (
                  <Link href={sortHref(col.field)} className="inline-flex items-center gap-1 hover:text-foreground">
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((t) => {
            const overdue =
              t.dueDate && isPast(t.dueDate) && t.status !== "DONE" && t.status !== "ARCHIVED";
            return (
              <TableRow key={t.id}>
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
                <TableCell className={cn("hidden text-sm sm:table-cell", overdue && "font-medium text-red-600")}>
                  {t.dueDate ? format(t.dueDate, "MMM d") : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground xl:table-cell">
                  {format(t.updatedAt, "MMM d")}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
