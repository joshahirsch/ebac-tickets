import type { TicketStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { TICKET_STATUS_META } from "@/lib/constants";

export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const meta = TICKET_STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        meta.badge,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
