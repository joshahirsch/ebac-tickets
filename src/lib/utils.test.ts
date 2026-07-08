import { describe, it, expect } from "vitest";
import { formatBytes, humanize, initials } from "@/lib/utils";

describe("utils", () => {
  it("formats bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("humanizes enum tokens", () => {
    expect(humanize("IN_PROGRESS")).toBe("In Progress");
    expect(humanize("MAINTENANCE")).toBe("Maintenance");
    expect(humanize("DONE")).toBe("Done");
  });

  it("derives initials", () => {
    expect(initials("Morgan Manager")).toBe("MM");
    expect(initials("admin@ebac.org")).toBe("A");
  });
});
