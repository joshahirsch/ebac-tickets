import type { TicketPriority } from "@prisma/client";
import { cn } from "@/lib/utils";
import { TICKET_PRIORITY_META } from "@/lib/constants";

export function PriorityBadge({
  priority,
  className,
}: {
  priority: TicketPriority;
  className?: string;
}) {
  const meta = TICKET_PRIORITY_META[priority];
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
