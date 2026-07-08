import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "page.tsx"),
  "utf8",
);

describe("tickets page archive wiring", () => {
  it("uses TicketTable and passes the signed-in role for archive UI", () => {
    expect(pageSource).toContain('from "@/components/ticket/ticket-table"');
    expect(pageSource).toContain("<TicketTable");
    expect(pageSource).toContain("userRole={user.role}");
  });
});
