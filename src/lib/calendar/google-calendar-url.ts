import {
  dateOnlyToGoogleAllDay,
  nextDateOnly,
  type DateOnly,
} from "@/lib/date/date-only";

export type GoogleCalendarTicketEvent = {
  key: string;
  title: string;
  dueDate: DateOnly;
  description?: string | null;
  ticketUrl: string;
};

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Build a Google Calendar "create event" URL for a ticket (all-day, no OAuth).
 * https://calendar.google.com/calendar/render?action=TEMPLATE&...
 */
export function buildGoogleCalendarUrl(ticket: GoogleCalendarTicketEvent): string {
  const text = `[${ticket.key}] ${ticket.title}`;
  const start = dateOnlyToGoogleAllDay(ticket.dueDate);
  const end = dateOnlyToGoogleAllDay(nextDateOnly(ticket.dueDate));

  const parts: string[] = [];
  if (ticket.description?.trim()) {
    parts.push(truncate(ticket.description.trim(), 800));
    parts.push("");
  }
  parts.push(`EBAC ticket: ${ticket.ticketUrl}`);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text,
    dates: `${start}/${end}`,
    details: parts.join("\n"),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function normalizeAppBaseUrl(appUrl?: string | null): string {
  const trimmed = (appUrl ?? "").trim().replace(/\/$/, "");
  if (!trimmed) return "http://localhost:3000";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return "http://localhost:3000";
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function ticketDetailUrl(ticketId: string, appUrl = process.env.NEXT_PUBLIC_APP_URL): string {
  const base = normalizeAppBaseUrl(appUrl);
  return `${base}/tickets/${ticketId}`;
}
