import "server-only";
import { GoogleCalendarApiError, type GoogleCalendarApi } from "./types";

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } };
    return data.error?.message ?? res.statusText;
  } catch {
    return res.statusText || "Google Calendar API error";
  }
}

export function createGoogleCalendarClient(fetchImpl: typeof fetch = fetch): GoogleCalendarApi {
  return {
    async createEvent(calendarId, event, accessToken) {
      const res = await fetchImpl(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        },
      );
      if (!res.ok) {
        throw new GoogleCalendarApiError(await parseError(res), res.status);
      }
      const data = (await res.json()) as { id?: string };
      if (!data.id) throw new GoogleCalendarApiError("Google did not return an event id.", res.status);
      return { id: data.id };
    },

    async updateEvent(calendarId, eventId, event, accessToken) {
      const res = await fetchImpl(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        },
      );
      if (!res.ok) {
        throw new GoogleCalendarApiError(await parseError(res), res.status);
      }
      const data = (await res.json()) as { id?: string };
      return { id: data.id ?? eventId };
    },

    async deleteEvent(calendarId, eventId, accessToken) {
      const res = await fetchImpl(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      // 404/410 = already gone; treat as success.
      if (res.status === 404 || res.status === 410) return;
      if (!res.ok && res.status !== 204) {
        throw new GoogleCalendarApiError(await parseError(res), res.status);
      }
    },
  };
}
