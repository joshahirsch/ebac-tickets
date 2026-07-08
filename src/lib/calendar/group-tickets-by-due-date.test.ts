import { describe, expect, it } from "vitest";
import { groupTicketsByDueDate } from "./group-tickets-by-due-date";

describe("groupTicketsByDueDate", () => {
  it("groups tickets onto their UTC calendar due day", () => {
    const tickets = [
      { id: "a", dueDate: new Date("2026-07-13T00:00:00.000Z"), title: "Midnight" },
      { id: "b", dueDate: new Date("2026-07-13T12:00:00.000Z"), title: "Noon" },
      { id: "c", dueDate: new Date("2026-07-14T12:00:00.000Z"), title: "Next day" },
    ];

    const groups = groupTicketsByDueDate(tickets);
    expect(groups.get("2026-07-13")?.map((t) => t.id)).toEqual(["a", "b"]);
    expect(groups.get("2026-07-14")?.map((t) => t.id)).toEqual(["c"]);
  });

  it("excludes tickets without a due date", () => {
    const groups = groupTicketsByDueDate([
      { id: "with", dueDate: "2026-07-13T12:00:00.000Z" },
      { id: "without", dueDate: null },
      { id: "undefined", dueDate: undefined },
    ]);

    expect(groups.size).toBe(1);
    expect(groups.get("2026-07-13")?.map((t) => t.id)).toEqual(["with"]);
  });

  it("does not shift a UTC-midnight due date to the previous local calendar day", () => {
    // Regression: treating DB UTC midnight as local midnight would land on Jul 12
    // in US timezones; grouping must stay on Jul 13.
    const groups = groupTicketsByDueDate([
      { id: "pmgt-2", dueDate: new Date("2026-07-13T00:00:00.000Z") },
    ]);
    expect([...groups.keys()]).toEqual(["2026-07-13"]);
  });
});
