import { todayYearMonthUtc, parseYearMonth, type YearMonth } from "@/lib/date/date-only";
import {
  parseTicketListSearchParams,
  type TicketListParams,
  type TicketSearchParamsRecord,
} from "@/lib/ticket-list-search-params";

function first(sp: TicketSearchParamsRecord, key: string): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export function parseCalendarMonthParam(
  sp: TicketSearchParamsRecord,
  reference = new Date(),
): YearMonth {
  const raw = first(sp, "month");
  if (raw && parseYearMonth(raw)) return raw;
  return todayYearMonthUtc(reference);
}

export function parseCalendarSearchParams(
  sp: TicketSearchParamsRecord,
  currentUserId: string,
  reference = new Date(),
): { params: TicketListParams; yearMonth: YearMonth } {
  const { params } = parseTicketListSearchParams(sp, currentUserId);
  return {
    params: {
      ...params,
      // Calendar is sorted by due date; ignore list-page sort defaults.
      sort: "dueDate:asc",
    },
    yearMonth: parseCalendarMonthParam(sp, reference),
  };
}
