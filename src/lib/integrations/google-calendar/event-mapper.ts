import {
  nextDateOnly,
  toDateOnly,
  type DateOnly,
} from "@/lib/date/date-only";
import { isValidHttpUrl, ticketDetailUrl } from "@/lib/calendar/google-calendar-url";
import { TICKET_PRIORITY_META, TICKET_STATUS_META } from "@/lib/constants";
import { hashSyncPayload } from "./tokens";
import type { GoogleCalendarEventPayload, SyncableTicket } from "./types";

const GOOGLE_EVENT_SUMMARY_MAX = 1024;

export function googleAllDayRange(dueDate: DateOnly): { start: DateOnly; end: DateOnly } {
  return {
    start: dueDate,
    // Google all-day end is exclusive.
    end: nextDateOnly(dueDate),
  };
}

export function buildEventDescription(ticket: SyncableTicket, ticketUrl: string): string {
  const key = `${ticket.project.key}-${ticket.number}`;
  const assignee =
    ticket.assignee?.name?.trim() ||
    ticket.assignee?.email ||
    "Unassigned";
  return [
    "EBAC Projects ticket",
    `Ticket: ${key}`,
    `Project: ${ticket.project.name} (${ticket.project.key})`,
    `Status: ${TICKET_STATUS_META[ticket.status]?.label ?? ticket.status}`,
    `Priority: ${TICKET_PRIORITY_META[ticket.priority]?.label ?? ticket.priority}`,
    `Assignee: ${assignee}`,
    `Link: ${ticketUrl}`,
  ].join("\n");
}

function truncateSummary(summary: string): string {
  if (summary.length <= GOOGLE_EVENT_SUMMARY_MAX) return summary;
  return `${summary.slice(0, GOOGLE_EVENT_SUMMARY_MAX - 1).trimEnd()}…`;
}

export function mapTicketToGoogleEvent(
  ticket: SyncableTicket,
  options?: { appUrl?: string },
): { event: GoogleCalendarEventPayload; dueDateOnly: DateOnly; contentHash: string } {
  const dueDateOnly = toDateOnly(ticket.dueDate);
  if (!dueDateOnly) {
    throw new Error("Ticket is missing a due date.");
  }

  const key = `${ticket.project.key}-${ticket.number}`;
  const ticketUrl = ticketDetailUrl(ticket.id, options?.appUrl);
  const { start, end } = googleAllDayRange(dueDateOnly);
  const description = buildEventDescription(ticket, ticketUrl);

  const event: GoogleCalendarEventPayload = {
    summary: truncateSummary(`[${key}] ${ticket.title}`),
    description,
    start: { date: start },
    end: { date: end },
    transparency: "transparent",
    extendedProperties: {
      private: {
        ebacTicketId: ticket.id,
        ebacTicketKey: key,
      },
    },
  };

  if (isValidHttpUrl(ticketUrl)) {
    event.source = { title: "EBAC Projects", url: ticketUrl };
  }

  const contentHash = hashSyncPayload({
    ticketId: ticket.id,
    key,
    title: ticket.title,
    dueDate: dueDateOnly,
    status: ticket.status,
    priority: ticket.priority,
    projectKey: ticket.project.key,
    projectName: ticket.project.name,
    ticketUrl,
  });

  return { event, dueDateOnly, contentHash };
}

/** Tickets that should appear on the assignee's personal calendar. */
export function isTicketEligibleForPersonalSync(
  ticket: Pick<SyncableTicket, "assigneeId" | "dueDate" | "isArchived" | "status">,
  userId: string,
): boolean {
  if (ticket.assigneeId !== userId) return false;
  if (ticket.isArchived) return false;
  if (ticket.status === "ARCHIVED" || ticket.status === "DONE") return false;
  if (!toDateOnly(ticket.dueDate)) return false;
  return true;
}
