import type { TicketPriority, TicketStatus } from "@prisma/client";
import type { DateOnly } from "@/lib/date/date-only";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
  "profile",
] as const;

export type GoogleOAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

export type GoogleCalendarEventPayload = {
  summary: string;
  description: string;
  start: { date: DateOnly };
  end: { date: DateOnly };
  transparency: "transparent" | "opaque";
  source?: { title: string; url: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
};

export type SyncableTicket = {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  dueDate: Date;
  assigneeId: string | null;
  isArchived: boolean;
  project: { key: string; name: string };
  assignee: { id: string; name: string | null; email: string } | null;
};

export type SyncSummary = {
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: number;
};

export type GoogleCalendarApi = {
  createEvent: (
    calendarId: string,
    event: GoogleCalendarEventPayload,
    accessToken: string,
  ) => Promise<{ id: string }>;
  updateEvent: (
    calendarId: string,
    eventId: string,
    event: GoogleCalendarEventPayload,
    accessToken: string,
  ) => Promise<{ id: string }>;
  deleteEvent: (
    calendarId: string,
    eventId: string,
    accessToken: string,
  ) => Promise<void>;
};

export class GoogleCalendarConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCalendarConfigError";
  }
}

export class GoogleCalendarApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GoogleCalendarApiError";
    this.status = status;
  }
}
