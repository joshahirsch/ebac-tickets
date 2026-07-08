import Link from "next/link";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
import type { TicketListItem } from "@/server/queries/tickets";
import { formatDateOnlyCompact, isDateOnlyPast, toDateOnly } from "@/lib/date/date-only";
import { cn, initials } from "@/lib/utils";
import { PriorityBadge } from "@/components/priority-badge";
import { TypeBadge } from "@/components/type-badge";

/**
 * Compact, presentational ticket card. Reused on the board and project detail.
 * Interaction (drag) is added by wrapping parents; the card itself just links.
 */
export function TicketCard({ ticket }: { ticket: TicketListItem }) {
  const dueDateOnly = toDateOnly(ticket.dueDate);
  const overdue =
    dueDateOnly &&
    isDateOnlyPast(dueDateOnly) &&
    ticket.status !== "DONE" &&
    ticket.status !== "ARCHIVED";

  return (
    <div className="rounded-md border bg-card p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">
          {ticket.project.key}-{ticket.number}
        </span>
        <TypeBadge type={ticket.type} />
      </div>

      <Link href={`/tickets/${ticket.id}`} className="block text-sm font-medium leading-snug hover:underline">
        {ticket.title}
      </Link>

      {ticket.labels.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {ticket.labels.map((l) => (
            <span
              key={l.labelId}
              className="rounded-full border px-1.5 text-[10px]"
              style={{ borderColor: l.label.color, color: l.label.color }}
            >
              {l.label.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between">
        <PriorityBadge priority={ticket.priority} />
        <div className="flex items-center gap-2">
          {dueDateOnly ? (
            <span className={cn("flex items-center gap-1 text-[11px] text-muted-foreground", overdue && "font-medium text-red-600")}>
              <CalendarClock className="h-3 w-3" />
              {formatDateOnlyCompact(dueDateOnly)}
            </span>
          ) : null}
          {ticket.assignee ? (
            <span
              title={ticket.assignee.name ?? ticket.assignee.email}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium"
            >
              {initials(ticket.assignee.name ?? ticket.assignee.email)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
