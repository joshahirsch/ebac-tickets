"use client";

import { CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function AddToGoogleCalendarLink({
  href,
  className,
  compact = false,
}: {
  href: string;
  className?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Add to Google Calendar"
        title="Add to Google Calendar"
        className={cn(
          "inline-flex shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline",
        className,
      )}
    >
      <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
      Add to Google Calendar
    </a>
  );
}
