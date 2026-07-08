import type { TicketPriority, TicketStatus } from "@prisma/client";

/** Workspace slug used by prisma/seed.ts */
export const EBAC_WORKSPACE_SLUG = "ebac";

/**
 * Project key for kickoff cards. Override with EBAC_KICKOFF_PROJECT_KEY when the
 * rollout board uses a different key (e.g. "EBAC").
 */
export const DEFAULT_KICKOFF_PROJECT_KEY = "PMGT";

/** Fallback keys tried when the primary key is not found. */
export const KICKOFF_PROJECT_KEY_FALLBACKS = ["EBAC", "PMGT"] as const;

export type KickoffPriority = "P0" | "P1" | "P2";

export type KickoffCardDef = {
  /** Stable per-project ticket number (PMGT-{number}). */
  number: number;
  title: string;
  priority: KickoffPriority;
  dueDate: string; // YYYY-MM-DD
  labels: string[];
  description: string;
  checklist?: string[];
  acceptanceCriteria?: string[];
  notes?: string;
};

export const KICKOFF_LABEL_META: Record<string, { color: string }> = {
  "kickoff-ready": { color: "#0f766e" },
  "darian-alignment": { color: "#115e59" },
  discovery: { color: "#2563eb" },
  "success-criteria": { color: "#1d4ed8" },
  governance: { color: "#4338ca" },
  training: { color: "#7c3aed" },
  "responsible-ai": { color: "#6d28d9" },
  survey: { color: "#0891b2" },
  interviews: { color: "#0e7490" },
  "project-management": { color: "#64748b" },
  audit: { color: "#b45309" },
  "staff-readiness": { color: "#d97706" },
  synthesis: { color: "#ca8a04" },
  privacy: { color: "#be123c" },
  "workflow-mapping": { color: "#059669" },
  "use-cases": { color: "#047857" },
  "opportunities-map": { color: "#16a34a" },
  prioritization: { color: "#15803d" },
  "quick-wins": { color: "#65a30d" },
  pilots: { color: "#4d7c0f" },
  deliverable: { color: "#0f766e" },
  "phase-two": { color: "#0369a1" },
  pricing: { color: "#075985" },
  presentation: { color: "#7c3aed" },
  "final-debrief": { color: "#6d28d9" },
  "check-ins": { color: "#475569" },
  handoff: { color: "#334155" },
  closeout: { color: "#1e293b" },
  "reusable-assets": { color: "#57534e" },
};

/** All PMGT engagement cards ship in Backlog until work begins. */
export const KICKOFF_DEFAULT_STATUS: TicketStatus = "BACKLOG";

export function mapKickoffPriority(priority: KickoffPriority): TicketPriority {
  switch (priority) {
    case "P0":
      return "URGENT";
    case "P1":
      return "HIGH";
    case "P2":
      return "MEDIUM";
  }
}

export function formatKickoffDescription(card: Pick<
  KickoffCardDef,
  "description" | "checklist" | "acceptanceCriteria" | "notes"
>): string {
  const parts = ["## Purpose", "", card.description.trim()];

  if (card.checklist?.length) {
    parts.push("", "## Checklist", ...card.checklist.map((item) => `- ${item}`));
  }

  if (card.acceptanceCriteria?.length) {
    parts.push(
      "",
      "## Acceptance criteria",
      ...card.acceptanceCriteria.map((item) => `- ${item}`),
    );
  }

  if (card.notes?.trim()) {
    parts.push("", "## Notes", "", card.notes.trim());
  }

  return parts.join("\n");
}

/** Minimum length for a kickoff description to be considered populated. */
export const KICKOFF_DESCRIPTION_MIN_LENGTH = 80;

export function kickoffDescriptionNeedsUpdate(
  existingDescription: string | null | undefined,
  expectedDescription: string,
): boolean {
  const existing = (existingDescription ?? "").trim();
  if (!existing) return true;
  if (existing === expectedDescription) return false;
  if (existing.length < KICKOFF_DESCRIPTION_MIN_LENGTH) return true;
  if (expectedDescription.includes("## Purpose") && !existing.includes("## Purpose")) return true;
  if (expectedDescription.includes("## Checklist") && !existing.includes("## Checklist")) return true;
  if (
    expectedDescription.includes("## Acceptance criteria") &&
    !existing.includes("## Acceptance criteria")
  ) {
    return true;
  }
  return existing !== expectedDescription;
}

export type KickoffSeedPlan = "create" | "update" | "skip";

export function planKickoffCardSeedAction(input: {
  exists: boolean;
  existingTitle: string | null;
  expectedTitle: string;
  existingDescription: string | null | undefined;
  expectedDescription: string;
  labelsMatch: boolean;
}): KickoffSeedPlan {
  if (!input.exists) return "create";
  if (
    input.existingTitle !== input.expectedTitle ||
    kickoffDescriptionNeedsUpdate(input.existingDescription, input.expectedDescription) ||
    !input.labelsMatch
  ) {
    return "update";
  }
  return "skip";
}

export function collectKickoffLabelNames(cards: KickoffCardDef[]): string[] {
  return [...new Set(cards.flatMap((card) => card.labels))].sort();
}

export { parseFormDateOnly as parseKickoffDueDate } from "@/lib/date/date-only";

export const EBAC_KICKOFF_CARDS: KickoffCardDef[] = [
  // PHASE 1 — Kickoff and alignment
  {
    number: 1,
    title: "Align Josh / Darian project roles and communication rhythm",
    priority: "P0",
    dueDate: "2026-07-12",
    labels: ["kickoff-ready", "darian-alignment"],
    description:
      "Clarify how Josh and Darian will divide client-facing responsibilities, internal review, delivery ownership, and escalation during the EBAC engagement.",
    checklist: [
      "Confirm Josh's role as AI Adoption and Technical Opportunity Lead / client-facing co-lead.",
      "Confirm Darian's role as relationship lead, final reviewer, and project owner.",
      "Define client communication rhythm.",
      "Define internal review cadence.",
      "Confirm where decisions, notes, and deliverables will live.",
    ],
    acceptanceCriteria: [
      "Role split is documented.",
      "Communication rhythm is agreed.",
      "Internal handoff process is clear.",
      "Darian and Josh both know who owns each major deliverable.",
    ],
  },
  {
    number: 2,
    title: "Build EBAC stakeholder and interview map",
    priority: "P0",
    dueDate: "2026-07-12",
    labels: ["kickoff-ready", "discovery"],
    description:
      "Identify who needs to participate in kickoff, discovery, survey, interviews, and final review.",
    checklist: [
      "Draft stakeholder list.",
      "Group stakeholders by role, program, or decision authority.",
      "Identify must-interview leaders.",
      "Identify optional contributors.",
      "Flag missing stakeholders for Darian/client follow-up.",
    ],
    acceptanceCriteria: [
      "Stakeholder list is ready for client review.",
      "Interview targets are prioritized.",
      "Missing contacts are documented.",
      "Discovery schedule can be built from the map.",
    ],
  },
  {
    number: 3,
    title: "Define project success criteria",
    priority: "P0",
    dueDate: "2026-07-13",
    labels: ["kickoff-ready", "success-criteria"],
    description:
      "Create a shared definition of what successful Phase One delivery means for EBAC, Josh, and Darian.",
    checklist: [
      "Define what EBAC should have at the end of Phase One.",
      "Confirm what \"AI readiness\" means in this context.",
      "Define what makes the AI Opportunities Map useful.",
      "Identify success metrics for training, discovery, and roadmap delivery.",
      "Document open assumptions.",
    ],
    acceptanceCriteria: [
      "Success criteria are written in client-facing language.",
      "Criteria connect to the final AI Opportunities Map.",
      "Criteria distinguish Phase One discovery from Phase Two implementation.",
      "Open decisions are visible.",
    ],
  },
  {
    number: 4,
    title: "Create project decision protocol",
    priority: "P1",
    dueDate: "2026-07-15",
    labels: ["kickoff-ready", "governance"],
    description:
      "Define how recommendations, risks, scope questions, and client decisions will be captured and resolved.",
    checklist: [
      "Define decision log format.",
      "Identify who approves scope changes.",
      "Define how risk decisions are escalated.",
      "Define how Darian reviews Josh-drafted deliverables.",
      "Add decision protocol to project workspace.",
    ],
    acceptanceCriteria: [
      "Decision log exists.",
      "Approval owner is clear.",
      "Review process is documented.",
      "Project team has one source of truth for decisions.",
    ],
  },
  // PHASE 2 — Training and discovery design
  {
    number: 5,
    title: "Prepare responsible AI training for children's services context",
    priority: "P1",
    dueDate: "2026-07-19",
    labels: ["training", "responsible-ai"],
    description:
      "Develop the initial AI training content for EBAC staff, focused on practical use, responsible adoption, privacy, risk, and realistic nonprofit workflows.",
    checklist: [
      "Draft training outline.",
      "Include examples relevant to children's services and nonprofit operations.",
      "Add responsible AI guardrails.",
      "Include practical use cases and limitations.",
      "Prepare discussion prompts for staff input.",
    ],
    acceptanceCriteria: [
      "Training outline is client-ready.",
      "Content avoids hype and focuses on responsible use.",
      "Examples are relevant to EBAC's environment.",
      "Training can feed directly into discovery themes.",
    ],
  },
  {
    number: 6,
    title: "Draft staff AI usage survey",
    priority: "P0",
    dueDate: "2026-07-19",
    labels: ["survey", "discovery"],
    description:
      "Create a survey that captures current AI usage, comfort level, perceived risks, workflow pain points, and priority opportunities across EBAC.",
    checklist: [
      "Draft survey questions.",
      "Include current usage questions.",
      "Include readiness and comfort questions.",
      "Include workflow bottleneck questions.",
      "Include risk/privacy/governance questions.",
      "Review with Darian before client release.",
    ],
    acceptanceCriteria: [
      "Survey is ready for EBAC approval.",
      "Questions are clear for non-technical staff.",
      "Survey output can support the audit and Opportunities Map.",
      "Darian review is complete.",
    ],
  },
  {
    number: 7,
    title: "Draft interview guide for key informants",
    priority: "P0",
    dueDate: "2026-07-22",
    labels: ["interviews", "discovery"],
    description:
      "Create a structured interview guide for leaders and staff to uncover operational pain points, AI opportunities, data/tool constraints, and governance concerns.",
    checklist: [
      "Draft core interview questions.",
      "Add role-specific probes.",
      "Include workflow and handoff questions.",
      "Include risk, data, and privacy questions.",
      "Include opportunity ranking prompts.",
      "Review with Darian.",
    ],
    acceptanceCriteria: [
      "Interview guide is ready for use.",
      "Questions support consistent synthesis.",
      "Guide can be used by Josh independently.",
      "Darian has approved or edited the guide.",
    ],
  },
  {
    number: 8,
    title: "Confirm discovery schedule and interview logistics",
    priority: "P1",
    dueDate: "2026-07-26",
    labels: ["interviews", "project-management"],
    description:
      "Turn the stakeholder map, survey, and interview guide into a working discovery plan.",
    checklist: [
      "Confirm interview targets.",
      "Confirm interview windows.",
      "Identify scheduling owner.",
      "Prepare calendar/email language if needed.",
      "Track completed and pending interviews.",
    ],
    acceptanceCriteria: [
      "Discovery calendar is usable.",
      "Interview owners are assigned.",
      "Scheduling gaps are visible.",
      "Josh knows which interviews he is leading solo.",
    ],
  },
  // PHASE 3 — Audit and discovery execution
  {
    number: 9,
    title: "Run current AI usage and readiness audit",
    priority: "P1",
    dueDate: "2026-08-02",
    labels: ["audit", "staff-readiness"],
    description:
      "Capture how EBAC staff currently use AI, where adoption is happening informally, and what readiness gaps exist.",
    checklist: [
      "Review survey results.",
      "Summarize current usage patterns.",
      "Identify high-comfort and low-comfort groups.",
      "Identify training needs.",
      "Capture concerns and misconceptions.",
    ],
    acceptanceCriteria: [
      "Current AI usage themes are summarized.",
      "Readiness gaps are documented.",
      "Findings are tied to program/workflow context.",
      "Output can feed the audit report and Opportunities Map.",
    ],
  },
  {
    number: 10,
    title: "Complete key informant interviews",
    priority: "P1",
    dueDate: "2026-08-05",
    labels: ["interviews", "synthesis"],
    description:
      "Conduct and synthesize interviews with priority EBAC stakeholders.",
    checklist: [
      "Complete assigned interviews.",
      "Capture notes in consistent format.",
      "Tag themes by workflow, opportunity, risk, and readiness.",
      "Identify repeated pain points.",
      "Identify standout use cases.",
    ],
    acceptanceCriteria: [
      "Priority interviews are completed or blockers documented.",
      "Notes are organized for synthesis.",
      "Themes are ready for Darian review.",
      "Major opportunities and risks are visible.",
    ],
  },
  {
    number: 11,
    title: "Inventory tools, data, privacy, and governance constraints",
    priority: "P0",
    dueDate: "2026-08-02",
    labels: ["audit", "governance", "privacy"],
    description:
      "Understand EBAC's current systems, data sensitivity, privacy considerations, and governance posture so recommendations are practical and responsible.",
    checklist: [
      "List relevant tools/platforms.",
      "Capture AI-related policies or absence of policies.",
      "Identify sensitive data concerns.",
      "Identify approval/compliance constraints.",
      "Note integration or access limitations.",
    ],
    acceptanceCriteria: [
      "Tool and data inventory is documented.",
      "Privacy and governance gaps are clear.",
      "Recommendations can be filtered by feasibility and risk.",
      "Phase Two dependencies are visible.",
    ],
  },
  {
    number: 12,
    title: "Analyze staff survey results",
    priority: "P1",
    dueDate: "2026-08-09",
    labels: ["survey", "synthesis"],
    description:
      "Convert staff survey responses into actionable themes for readiness, pain points, risks, and AI opportunity areas.",
    checklist: [
      "Export or summarize survey responses.",
      "Identify top pain points.",
      "Identify top opportunity areas.",
      "Identify adoption concerns.",
      "Pull representative themes without overquoting.",
      "Prepare synthesis for Darian.",
    ],
    acceptanceCriteria: [
      "Survey themes are summarized.",
      "Findings are grouped by opportunity, readiness, and risk.",
      "Insights can be used in client deliverables.",
      "Darian can review without reading every raw response.",
    ],
  },
  // PHASE 4 — Workflow and opportunity mapping
  {
    number: 13,
    title: "Map priority workflows and pain points",
    priority: "P1",
    dueDate: "2026-08-16",
    labels: ["workflow-mapping", "discovery"],
    description:
      "Document the workflows where AI may reduce friction, improve consistency, or support staff capacity.",
    checklist: [
      "Identify priority workflows from interviews and survey.",
      "Map current-state steps.",
      "Identify bottlenecks and repetitive tasks.",
      "Identify human judgment points.",
      "Identify where AI should not be used.",
    ],
    acceptanceCriteria: [
      "Priority workflows are mapped.",
      "Pain points are specific.",
      "Human oversight points are clear.",
      "Workflow maps support opportunity scoring.",
    ],
  },
  {
    number: 14,
    title: "Build AI use-case inventory",
    priority: "P1",
    dueDate: "2026-08-19",
    labels: ["use-cases", "opportunities-map"],
    description:
      "Create a structured inventory of potential AI use cases from training, survey, interviews, and workflow mapping.",
    checklist: [
      "Capture all candidate use cases.",
      "Group by department, workflow, or function.",
      "Note user need and expected benefit.",
      "Note complexity, risk, and dependencies.",
      "Remove duplicates.",
    ],
    acceptanceCriteria: [
      "Use-case inventory is complete enough for scoring.",
      "Each use case has a clear problem statement.",
      "Risks and dependencies are visible.",
      "Duplicates are merged.",
    ],
  },
  {
    number: 15,
    title: "Score and prioritize AI opportunities",
    priority: "P0",
    dueDate: "2026-08-23",
    labels: ["prioritization", "opportunities-map"],
    description:
      "Rank AI use cases by value, feasibility, risk, urgency, and readiness so EBAC can make practical decisions.",
    checklist: [
      "Define scoring criteria.",
      "Score candidate use cases.",
      "Identify quick wins.",
      "Identify medium-term pilots.",
      "Identify high-risk or defer candidates.",
      "Review prioritization with Darian.",
    ],
    acceptanceCriteria: [
      "Prioritized opportunity list is complete.",
      "Quick wins and pilots are separated.",
      "Risk is included in prioritization.",
      "Darian has reviewed the scoring logic.",
    ],
  },
  {
    number: 16,
    title: "Draft quick wins and pilot recommendations",
    priority: "P1",
    dueDate: "2026-08-26",
    labels: ["quick-wins", "pilots"],
    description:
      "Translate the opportunity scoring into practical next moves EBAC can understand and act on.",
    checklist: [
      "Identify low-risk quick wins.",
      "Identify 2–4 pilot candidates.",
      "Define expected benefit for each.",
      "Define owner, effort, and dependency assumptions.",
      "Include risks and safeguards.",
    ],
    acceptanceCriteria: [
      "Quick wins are specific and actionable.",
      "Pilot recommendations are realistic.",
      "Recommendations include risk controls.",
      "Output can drop into the AI Opportunities Map.",
    ],
  },
  // PHASE 5 — Deliverables and roadmap
  {
    number: 17,
    title: "Draft organizational AI audit findings",
    priority: "P1",
    dueDate: "2026-08-30",
    labels: ["audit", "deliverable"],
    description:
      "Create the first synthesis of EBAC's current AI landscape, readiness, risks, and operational opportunity areas.",
    checklist: [
      "Summarize current AI usage.",
      "Summarize readiness themes.",
      "Summarize governance and privacy gaps.",
      "Summarize workflow pain points.",
      "Include implications for responsible adoption.",
    ],
    acceptanceCriteria: [
      "Findings are written in client-facing language.",
      "Findings are evidence-based from discovery.",
      "Findings distinguish observation from recommendation.",
      "Draft is ready for Darian review.",
    ],
  },
  {
    number: 18,
    title: "Draft AI Opportunities Map",
    priority: "P0",
    dueDate: "2026-09-02",
    labels: ["opportunities-map", "deliverable"],
    description:
      "Create the anchor Phase One deliverable: a prioritized map of AI opportunities, implementation paths, risks, sequencing, and next steps.",
    checklist: [
      "Add opportunity categories.",
      "Add scored/prioritized use cases.",
      "Add quick wins.",
      "Add pilot recommendations.",
      "Add governance recommendations.",
      "Add technical roadmap.",
      "Add Phase Two implementation options.",
    ],
    acceptanceCriteria: [
      "Opportunities Map is coherent as a standalone deliverable.",
      "Recommendations are prioritized and sequenced.",
      "Risks and safeguards are included.",
      "Draft is ready for Darian review.",
    ],
  },
  {
    number: 19,
    title: "Build Phase Two implementation menu",
    priority: "P1",
    dueDate: "2026-09-06",
    labels: ["phase-two", "pricing"],
    description:
      "Define realistic next-phase options EBAC can choose from after the Phase One audit and roadmap.",
    checklist: [
      "Identify implementation workstreams.",
      "Define light, standard, and premium options if useful.",
      "Estimate effort and sequencing.",
      "Identify dependencies.",
      "Include pricing assumptions if available.",
    ],
    acceptanceCriteria: [
      "Phase Two menu is clear.",
      "Options connect directly to Phase One findings.",
      "Scope boundaries are visible.",
      "Darian can use the menu in client follow-up.",
    ],
  },
  {
    number: 20,
    title: "Prepare final presentation and debrief",
    priority: "P1",
    dueDate: "2026-09-09",
    labels: ["presentation", "final-debrief"],
    description:
      "Turn the audit findings and Opportunities Map into a clear final client presentation.",
    checklist: [
      "Draft presentation outline.",
      "Include executive summary.",
      "Include top findings.",
      "Include priority opportunities.",
      "Include recommended next steps.",
      "Include Phase Two options.",
      "Review with Darian.",
    ],
    acceptanceCriteria: [
      "Presentation is client-ready.",
      "Storyline is clear.",
      "Recommendations are decision-oriented.",
      "Darian review is complete before delivery.",
    ],
  },
  // PHASE 6 — Project management and closeout
  {
    number: 21,
    title: "Maintain biweekly check-in notes and action items",
    priority: "P2",
    dueDate: "2026-09-13",
    labels: ["project-management", "check-ins"],
    description:
      "Keep recurring project communication organized so decisions, blockers, and next steps do not get lost.",
    checklist: [
      "Create check-in note template.",
      "Track decisions.",
      "Track blockers.",
      "Track action items.",
      "Carry unresolved items forward.",
    ],
    acceptanceCriteria: [
      "Check-in notes are current.",
      "Open action items are visible.",
      "Decisions are captured.",
      "Darian/client follow-ups are easy to identify.",
    ],
  },
  {
    number: 22,
    title: "Create client handoff packet",
    priority: "P1",
    dueDate: "2026-09-16",
    labels: ["handoff", "deliverable"],
    description:
      "Package final materials so EBAC can understand what was delivered, what decisions remain, and what should happen next.",
    checklist: [
      "Gather final audit.",
      "Gather Opportunities Map.",
      "Gather Phase Two menu.",
      "Gather presentation.",
      "Summarize open decisions.",
      "Summarize recommended next actions.",
    ],
    acceptanceCriteria: [
      "Final packet is organized.",
      "Client can use materials after the engagement.",
      "Open decisions are clear.",
      "Next steps are explicit.",
    ],
  },
  {
    number: 23,
    title: "Close Phase One and capture lessons learned",
    priority: "P2",
    dueDate: "2026-09-20",
    labels: ["closeout", "reusable-assets"],
    description:
      "Complete internal closeout with Darian and document what should be reused for future AI-for-nonprofits work.",
    checklist: [
      "Confirm final deliverables sent.",
      "Confirm follow-up owner.",
      "Capture lessons learned.",
      "Capture reusable templates.",
      "Identify Phase Two sales/follow-up opportunities.",
    ],
    acceptanceCriteria: [
      "Phase One is closed cleanly.",
      "Follow-up ownership is clear.",
      "Reusable assets are captured.",
      "Phase Two opportunities are documented.",
    ],
  },
];

export const KICKOFF_CARD_NUMBERS = EBAC_KICKOFF_CARDS.map((card) => card.number);
