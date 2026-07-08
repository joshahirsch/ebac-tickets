import "server-only";
import { parseGoogleApiErrorBody } from "./sync-errors";
import { GoogleCalendarApiError, type GoogleCalendarApi } from "./types";

async function parseError(res: Response): Promise<GoogleCalendarApiError> {
  const fallback = res.statusText || "Google Calendar API error";
  try {
    const body = await res.json();
    const parsed = parseGoogleApiErrorBody(body, res.status, fallback);
    return new GoogleCalendarApiError(parsed.message, parsed.status, {
      code: parsed.code,
      reason: parsed.reason,
    });
  } catch {
    return new GoogleCalendarApiError(fallback, res.status, { code: res.status });
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
        throw await parseError(res);
      }
      const data = (await res.json()) as { id?: string };
      if (!data.id) {
        throw new GoogleCalendarApiError("Google did not return an event id.", res.status, {
          code: res.status,
        });
      }
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
        throw await parseError(res);
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
        throw await parseError(res);
      }
    },
  };
}
