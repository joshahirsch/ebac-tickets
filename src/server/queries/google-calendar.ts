import "server-only";
import { prisma } from "@/lib/prisma";
import { isGoogleCalendarConfigured } from "@/lib/integrations/google-calendar/oauth";
import {
  parsePersistedSyncError,
  type PersistedSyncErrorDetails,
} from "@/lib/integrations/google-calendar/sync-errors";

export type GoogleCalendarConnectionView = {
  configured: boolean;
  connected: boolean;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR" | "NOT_CONNECTED";
  googleAccountEmail: string | null;
  calendarId: string;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  lastSyncErrorDetails: PersistedSyncErrorDetails | null;
};

export async function getGoogleCalendarConnectionView(
  userId: string,
): Promise<GoogleCalendarConnectionView> {
  const configured = isGoogleCalendarConfigured();
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return {
      configured,
      connected: false,
      status: "NOT_CONNECTED",
      googleAccountEmail: null,
      calendarId: "primary",
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
      lastSyncErrorDetails: null,
    };
  }

  return {
    configured,
    connected: connection.status === "CONNECTED" || connection.status === "ERROR",
    status: connection.status,
    googleAccountEmail: connection.googleAccountEmail,
    calendarId: connection.calendarId,
    lastSyncAt: connection.lastSyncAt,
    lastSyncStatus: connection.lastSyncStatus,
    lastSyncError: connection.lastSyncError,
    lastSyncErrorDetails: parsePersistedSyncError(connection.lastSyncError),
  };
}

export async function getTicketCalendarSyncForUser(userId: string, ticketId: string) {
  return prisma.ticketCalendarSync.findUnique({
    where: { userId_ticketId: { userId, ticketId } },
  });
}
