import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CalendarMonthView,
  mapTicketForCalendar,
  type CalendarTicketView,
} from "@/components/calendar/calendar-month-view";
import {
  getAssigneeColorClasses,
  getAssigneeDisplayName,
} from "@/lib/calendar/assignee-colors";

function makeTicket(
  overrides: Partial<CalendarTicketView> & Pick<CalendarTicketView, "id" | "dueDate">,
): CalendarTicketView {
  return {
    key: overrides.key ?? "PMGT-1",
    title: overrides.title ?? "Sample ticket",
    status: "TODO",
    priority: "MEDIUM",
    project: { key: "PMGT", name: "EBAC Project Management" },
    assignee: null,
    href: `/tickets/${overrides.id}`,
    googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE",
    ...overrides,
  };
}

describe("CalendarMonthView assignee colors", () => {
  const joshAssignee = { id: "user-josh", name: "Josh Hirsch", email: "josh@example.com" };
  const dariaAssignee = { id: "user-daria", name: "Daria Smith", email: "daria@example.com" };

  const tickets = [
    makeTicket({
      id: "ticket-1",
      key: "PMGT-3",
      title: "Define project success criteria",
      dueDate: "2026-07-13",
      assignee: joshAssignee,
    }),
    makeTicket({
      id: "ticket-2",
      key: "PMGT-4",
      title: "Review kickoff notes",
      dueDate: "2026-07-13",
      assignee: joshAssignee,
    }),
    makeTicket({
      id: "ticket-3",
      key: "PMGT-5",
      title: "Draft timeline",
      dueDate: "2026-07-14",
      assignee: dariaAssignee,
    }),
    makeTicket({
      id: "ticket-4",
      key: "PMGT-6",
      title: "Unowned follow-up",
      dueDate: "2026-07-15",
      assignee: null,
    }),
  ];

  it("applies assignee color classes to ticket pills", () => {
    const html = renderToStaticMarkup(
      createElement(CalendarMonthView, {
        yearMonth: "2026-07",
        tickets,
        hasActiveFilters: false,
        filterQuery: {},
      }),
    );

    const joshColors = getAssigneeColorClasses(joshAssignee);
    const dariaColors = getAssigneeColorClasses(dariaAssignee);
    const unassignedColors = getAssigneeColorClasses(null);

    expect(html).toContain(joshColors.pill);
    expect(html).toContain(dariaColors.pill);
    expect(html).toContain(unassignedColors.pill);
    expect(joshColors.pill).not.toBe(dariaColors.pill);
  });

  it("includes assignee context in pill title and aria-label", () => {
    const html = renderToStaticMarkup(
      createElement(CalendarMonthView, {
        yearMonth: "2026-07",
        tickets: [tickets[0]!],
        hasActiveFilters: false,
        filterQuery: {},
      }),
    );

    const label =
      "PMGT-3, Define project success criteria, assigned to Josh Hirsch, due July 13";
    expect(html).toContain(`title="${label}"`);
    expect(html).toContain(`aria-label="${label}"`);
  });

  it("labels unassigned tickets explicitly", () => {
    const html = renderToStaticMarkup(
      createElement(CalendarMonthView, {
        yearMonth: "2026-07",
        tickets: [tickets[3]!],
        hasActiveFilters: false,
        filterQuery: {},
      }),
    );

    expect(html).toContain("assigned to Unassigned");
  });

  it("renders a compact legend for visible assignees with counts", () => {
    const html = renderToStaticMarkup(
      createElement(CalendarMonthView, {
        yearMonth: "2026-07",
        tickets,
        hasActiveFilters: false,
        filterQuery: {},
      }),
    );

    expect(html).toContain('aria-label="Assignee legend"');
    expect(html).toContain("Daria Smith · 1");
    expect(html).toContain("Josh Hirsch · 2");
    expect(html).toContain("Unassigned · 1");

    const legendStart = html.indexOf('aria-label="Assignee legend"');
    const dariaPos = html.indexOf("Daria Smith · 1", legendStart);
    const joshPos = html.indexOf("Josh Hirsch · 2", legendStart);
    const unassignedPos = html.indexOf("Unassigned · 1", legendStart);
    expect(dariaPos).toBeLessThan(joshPos);
    expect(joshPos).toBeLessThan(unassignedPos);
  });

  it("gives tickets with the same assignee the same color treatment", () => {
    const sameAssigneeTickets = tickets.filter((ticket) => ticket.assignee?.id === joshAssignee.id);
    const colors = sameAssigneeTickets.map((ticket) => getAssigneeColorClasses(ticket.assignee));
    expect(colors[0]).toEqual(colors[1]);
  });
});

describe("mapTicketForCalendar", () => {
  it("preserves assignee data for calendar coloring", () => {
    const assignee = { id: "user-1", name: "Josh Hirsch", email: "josh@example.com" };
    const mapped = mapTicketForCalendar({
      id: "ticket-1",
      number: 3,
      title: "Define project success criteria",
      status: "TODO",
      priority: "HIGH",
      dueDate: "2026-07-13",
      project: { key: "PMGT", name: "EBAC Project Management" },
      assignee,
    });

    expect(mapped.assignee).toEqual(assignee);
    expect(getAssigneeDisplayName(mapped.assignee)).toBe("Josh Hirsch");
  });
});
