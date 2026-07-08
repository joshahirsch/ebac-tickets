import { describe, expect, it } from "vitest";
import {
  EBAC_KICKOFF_CARDS,
  KICKOFF_CARD_NUMBERS,
  KICKOFF_DEFAULT_STATUS,
  KICKOFF_LABEL_META,
  KICKOFF_REPORTER_EMAIL,
  KICKOFF_REPORTER_NAME,
  collectKickoffLabelNames,
  formatKickoffDescription,
  kickoffDescriptionNeedsUpdate,
  kickoffReporterNeedsUpdate,
  mapKickoffPriority,
  parseKickoffDueDate,
  planKickoffCardSeedAction,
} from "./seed-ebac-kickoff";

describe("seed-ebac-kickoff", () => {
  it("maps kickoff priorities to ticket priorities", () => {
    expect(mapKickoffPriority("P0")).toBe("URGENT");
    expect(mapKickoffPriority("P1")).toBe("HIGH");
    expect(mapKickoffPriority("P2")).toBe("MEDIUM");
  });

  it("defaults engagement cards to backlog status", () => {
    expect(KICKOFF_DEFAULT_STATUS).toBe("BACKLOG");
  });

  it("formats descriptions with purpose, checklist, and acceptance criteria", () => {
    const text = formatKickoffDescription({
      description: "Main body",
      checklist: ["Step one"],
      acceptanceCriteria: ["Done when approved"],
    });

    expect(text).toContain("## Purpose");
    expect(text).toContain("Main body");
    expect(text).toContain("## Checklist");
    expect(text).toContain("- Step one");
    expect(text).toContain("## Acceptance criteria");
    expect(text).toContain("- Done when approved");
  });

  it("includes notes when provided", () => {
    const text = formatKickoffDescription({
      description: "Define categories",
      notes: "Suggested categories:\n\n- General Support",
      acceptanceCriteria: ["Approved"],
    });

    expect(text).toContain("## Notes");
    expect(text).toContain("Suggested categories:");
    expect(text).toContain("- General Support");
  });

  it("detects missing or stale kickoff descriptions", () => {
    const expected = formatKickoffDescription({
      description: "Purpose text",
      checklist: ["Step one"],
      acceptanceCriteria: ["Done"],
    });

    expect(kickoffDescriptionNeedsUpdate(null, expected)).toBe(true);
    expect(kickoffDescriptionNeedsUpdate("Too short", expected)).toBe(true);
    expect(kickoffDescriptionNeedsUpdate("Purpose text only", expected)).toBe(true);
    expect(kickoffDescriptionNeedsUpdate(expected, expected)).toBe(false);
  });

  it("detects when kickoff reporter id does not match expected user", () => {
    expect(kickoffReporterNeedsUpdate("admin-id", "josh-id")).toBe(true);
    expect(kickoffReporterNeedsUpdate("josh-id", "josh-id")).toBe(false);
    expect(kickoffReporterNeedsUpdate(null, "josh-id")).toBe(true);
  });

  it("defines canonical kickoff reporter identity", () => {
    expect(KICKOFF_REPORTER_NAME).toBe("Josh Hirsch");
    expect(KICKOFF_REPORTER_EMAIL).toBe("josh.hirsch@gmail.com");
  });

  it("plans update when reporter does not match Josh Hirsch", () => {
    const expected = formatKickoffDescription({
      description: "Purpose text",
      checklist: ["Step one"],
      acceptanceCriteria: ["Done"],
    });

    expect(
      planKickoffCardSeedAction({
        exists: true,
        existingTitle: "Kickoff agenda",
        expectedTitle: "Kickoff agenda",
        existingDescription: expected,
        expectedDescription: expected,
        labelsMatch: true,
        reporterMatches: false,
      }),
    ).toBe("update");
  });

  it("plans update when an existing seeded card is missing description content", () => {
    const expected = formatKickoffDescription({
      description: "Purpose text",
      checklist: ["Step one"],
      acceptanceCriteria: ["Done"],
    });

    expect(
      planKickoffCardSeedAction({
        exists: true,
        existingTitle: "Kickoff agenda",
        expectedTitle: "Kickoff agenda",
        existingDescription: "",
        expectedDescription: expected,
        labelsMatch: true,
      }),
    ).toBe("update");
  });

  it("skips existing seeded cards with the canonical description", () => {
    const expected = formatKickoffDescription({
      description: "Purpose text",
      checklist: ["Step one"],
      acceptanceCriteria: ["Done"],
    });

    expect(
      planKickoffCardSeedAction({
        exists: true,
        existingTitle: "Kickoff agenda",
        expectedTitle: "Kickoff agenda",
        existingDescription: expected,
        expectedDescription: expected,
        labelsMatch: true,
      }),
    ).toBe("skip");
  });

  it("plans create when no matching ticket exists", () => {
    expect(
      planKickoffCardSeedAction({
        exists: false,
        existingTitle: null,
        expectedTitle: "New card",
        existingDescription: null,
        expectedDescription: "anything",
        labelsMatch: false,
      }),
    ).toBe("create");
  });

  it("parses due dates as UTC noon", () => {
    const date = parseKickoffDueDate("2026-07-13");
    expect(date.toISOString()).toBe("2026-07-13T12:00:00.000Z");
  });

  it("defines unique card titles and stable PMGT numbers", () => {
    const titles = EBAC_KICKOFF_CARDS.map((card) => card.title);
    const numbers = EBAC_KICKOFF_CARDS.map((card) => card.number);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).toEqual(KICKOFF_CARD_NUMBERS);
    expect(numbers).toHaveLength(23);
  });

  it("defines metadata for every referenced kickoff label", () => {
    const labelNames = collectKickoffLabelNames(EBAC_KICKOFF_CARDS);
    for (const name of labelNames) {
      expect(KICKOFF_LABEL_META[name]).toBeDefined();
    }
  });

  it("covers the EBAC engagement themes instead of ticketing rollout tasks", () => {
    const titles = EBAC_KICKOFF_CARDS.map((card) => card.title).join(" ");
    expect(titles).toContain("Draft AI Opportunities Map");
    expect(titles).toContain("Prepare responsible AI training");
    expect(titles).not.toContain("Decide who can close tickets");
    expect(titles).not.toContain("Define ticket status workflow");
  });
});
