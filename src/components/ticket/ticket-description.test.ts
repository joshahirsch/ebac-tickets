import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TicketDescription } from "@/components/ticket/ticket-description";

describe("TicketDescription", () => {
  it("renders purpose, checklist, and acceptance criteria sections", () => {
    const text = [
      "## Purpose",
      "",
      "Prepare the kickoff meeting.",
      "",
      "## Checklist",
      "- Confirm attendees",
      "- Assign next steps",
      "",
      "## Acceptance criteria",
      "- Agenda is ready",
    ].join("\n");

    const html = renderToStaticMarkup(createElement(TicketDescription, { text }));

    expect(html).toContain("Purpose");
    expect(html).toContain("Prepare the kickoff meeting.");
    expect(html).toContain("<li>Confirm attendees</li>");
    expect(html).toContain("Acceptance criteria");
    expect(html).toContain("<li>Agenda is ready</li>");
  });
});
