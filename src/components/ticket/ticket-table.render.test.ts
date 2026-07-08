import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/tickets",
  useSearchParams: () => new URLSearchParams(),
}));

import { TicketTable, type TicketTableItem } from "@/components/ticket/ticket-table";

const sampleTicket: TicketTableItem = {
  id: "ticket-1",
  number: 1,
  title: "Sample ticket",
  status: "TODO",
  priority: "MEDIUM",
  type: "TASK",
  isArchived: false,
  dueDate: null,
  updatedAt: "2026-07-08T00:00:00.000Z",
  project: { key: "EBAC", name: "EBAC" },
  assignee: { id: "user-1", name: "EBAC Admin", email: "admin@ebac.org" },
  labels: [],
};

describe("TicketTable archive controls rendering", () => {
  it("renders checkbox and archive controls when canArchive is true", () => {
    const html = renderToStaticMarkup(
      createElement(TicketTable, {
        tickets: [sampleTicket],
        currentSort: "updatedAt:desc",
        canArchive: true,
        viewingArchived: false,
      }),
    );

    expect(html).toContain('role="checkbox"');
    expect(html).toContain('aria-label="Archive ticket"');
  });

  it("hides checkbox and archive controls when canArchive is false", () => {
    const html = renderToStaticMarkup(
      createElement(TicketTable, {
        tickets: [sampleTicket],
        currentSort: "updatedAt:desc",
        canArchive: false,
        viewingArchived: false,
      }),
    );

    expect(html).not.toContain('role="checkbox"');
    expect(html).not.toContain('aria-label="Archive ticket"');
  });
});
