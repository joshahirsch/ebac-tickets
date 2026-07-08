import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TicketCard } from "@/components/ticket/ticket-card";
import type { TicketListItem } from "@/server/queries/tickets";

const pmgtTicket = {
  id: "cmrc5885y002ylmhmodfqkx5g",
  number: 19,
  title: "Draft training guide and quick-start SOP",
  status: "TODO",
  priority: "MEDIUM",
  type: "TASK",
  isArchived: false,
  dueDate: null,
  updatedAt: new Date("2026-07-08T00:00:00.000Z"),
  project: { key: "PMGT", name: "EBAC Project Management" },
  assignee: null,
  labels: [],
} as unknown as TicketListItem;

describe("TicketCard detail links", () => {
  it("links the board card to the ticket detail route by database id", () => {
    const html = renderToStaticMarkup(createElement(TicketCard, { ticket: pmgtTicket }));

    expect(html).toContain('href="/tickets/cmrc5885y002ylmhmodfqkx5g"');
    expect(html).toContain("PMGT-19");
    expect(html).toContain("Draft training guide and quick-start SOP");
  });
});
