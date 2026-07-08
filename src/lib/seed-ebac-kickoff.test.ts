import { describe, expect, it } from "vitest";
import {
  EBAC_KICKOFF_CARDS,
  KICKOFF_PHASE_META,
  formatKickoffDescription,
  kickoffDescriptionNeedsUpdate,
  mapKickoffPhaseStatus,
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

  it("maps phases to backlog/todo statuses", () => {
    expect(mapKickoffPhaseStatus("kickoff-ready")).toBe("BACKLOG");
    expect(mapKickoffPhaseStatus("discovery-decisions")).toBe("BACKLOG");
    expect(mapKickoffPhaseStatus("build-configure")).toBe("TODO");
    expect(mapKickoffPhaseStatus("post-launch-hypercare")).toBe("TODO");
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

  it("plans update when an existing seeded card is missing description content", () => {
    const expected = formatKickoffDescription({
      description: "Purpose text",
      checklist: ["Step one"],
      acceptanceCriteria: ["Done"],
    });

    expect(
      planKickoffCardSeedAction({
        existingTitle: "Kickoff agenda",
        existingDescription: "",
        expectedDescription: expected,
        hasPhaseLabel: true,
      }),
    ).toBe("update-description");
  });

  it("skips existing seeded cards with the canonical description", () => {
    const expected = formatKickoffDescription({
      description: "Purpose text",
      checklist: ["Step one"],
      acceptanceCriteria: ["Done"],
    });

    expect(
      planKickoffCardSeedAction({
        existingTitle: "Kickoff agenda",
        existingDescription: expected,
        expectedDescription: expected,
        hasPhaseLabel: true,
      }),
    ).toBe("skip");
  });

  it("plans create when no matching ticket exists", () => {
    expect(
      planKickoffCardSeedAction({
        existingTitle: null,
        existingDescription: null,
        expectedDescription: "anything",
        hasPhaseLabel: false,
      }),
    ).toBe("create");
  });

  it("parses due dates as UTC noon", () => {
    const date = parseKickoffDueDate("2026-07-13");
    expect(date.toISOString()).toBe("2026-07-13T12:00:00.000Z");
  });

  it("defines unique card titles", () => {
    const titles = EBAC_KICKOFF_CARDS.map((card) => card.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("covers every kickoff phase label", () => {
    const phases = new Set(EBAC_KICKOFF_CARDS.map((card) => card.phase));
    for (const phase of Object.keys(KICKOFF_PHASE_META)) {
      expect(phases.has(phase as keyof typeof KICKOFF_PHASE_META)).toBe(true);
    }
  });
});
