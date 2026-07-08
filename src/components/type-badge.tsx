import type { TicketType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { TICKET_TYPE_META } from "@/lib/constants";

export function TypeBadge({ type, className }: { type: TicketType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      {TICKET_TYPE_META[type].label}
    </span>
  );
}
