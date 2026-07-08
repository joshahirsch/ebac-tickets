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

export type KickoffPhase =
  | "kickoff-ready"
  | "discovery-decisions"
  | "build-configure"
  | "uat-validation"
  | "launch-prep"
  | "post-launch-hypercare";

export type KickoffPriority = "P0" | "P1" | "P2";

export type KickoffCardDef = {
  phase: KickoffPhase;
  title: string;
  priority: KickoffPriority;
  dueDate: string; // YYYY-MM-DD
  description: string;
  checklist?: string[];
  acceptanceCriteria?: string[];
  notes?: string;
};

export const KICKOFF_PHASE_META: Record<
  KickoffPhase,
  { label: string; labelColor: string; status: TicketStatus }
> = {
  "kickoff-ready": {
    label: "Kickoff Ready",
    labelColor: "#0f766e",
    status: "BACKLOG",
  },
  "discovery-decisions": {
    label: "Discovery / Decisions",
    labelColor: "#2563eb",
    status: "BACKLOG",
  },
  "build-configure": {
    label: "Build / Configure",
    labelColor: "#7c3aed",
    status: "TODO",
  },
  "uat-validation": {
    label: "UAT / Validation",
    labelColor: "#d97706",
    status: "TODO",
  },
  "launch-prep": {
    label: "Launch Prep",
    labelColor: "#16a34a",
    status: "TODO",
  },
  "post-launch-hypercare": {
    label: "Post-Launch / Hypercare",
    labelColor: "#64748b",
    status: "TODO",
  },
};

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

export function mapKickoffPhaseStatus(phase: KickoffPhase): TicketStatus {
  return KICKOFF_PHASE_META[phase].status;
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

export type KickoffSeedPlan = "create" | "update-description" | "skip";

export function planKickoffCardSeedAction(input: {
  existingTitle: string | null;
  existingDescription: string | null | undefined;
  expectedDescription: string;
  hasPhaseLabel: boolean;
}): KickoffSeedPlan {
  if (!input.existingTitle) return "create";
  if (
    kickoffDescriptionNeedsUpdate(input.existingDescription, input.expectedDescription) ||
    !input.hasPhaseLabel
  ) {
    return "update-description";
  }
  return "skip";
}

export function parseKickoffDueDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export const EBAC_KICKOFF_CARDS: KickoffCardDef[] = [
  // A. Kickoff Ready
  {
    phase: "kickoff-ready",
    title: "Kickoff agenda and desired outcomes",
    priority: "P0",
    dueDate: "2026-07-12",
    description:
      "Prepare and run the official EBAC project kickoff on Monday, July 13, 2026. The meeting should align stakeholders on project goals, user roles, ticket workflow, success criteria, launch timeline, open decisions, and immediate next steps.",
    checklist: [
      "Confirm attendees",
      "Confirm meeting objective",
      "Review current pain points",
      "Review proposed workflow",
      "Confirm ticket categories",
      "Confirm statuses and priorities",
      "Confirm permissions model",
      "Identify pilot users",
      "Identify launch risks",
      "Assign next steps",
    ],
    acceptanceCriteria: [
      "Kickoff agenda is ready before the meeting.",
      "Required decisions are captured.",
      "Owners are assigned for next steps.",
      "Open questions are moved into board cards.",
    ],
  },
  {
    phase: "kickoff-ready",
    title: "Confirm EBAC stakeholder roster",
    priority: "P0",
    dueDate: "2026-07-12",
    description:
      "Identify everyone who needs to participate in kickoff, approve workflow decisions, use the system, or receive launch communications.",
    checklist: [
      "Identify executive/project sponsor",
      "Identify day-to-day EBAC lead",
      "Identify managers/team leads",
      "Identify daily users",
      "Identify admin users",
      "Identify escalation contacts",
      "Confirm emails for each stakeholder",
      "Confirm who needs access before kickoff",
    ],
    acceptanceCriteria: [
      "Stakeholder roster is documented.",
      "Each stakeholder has a role or purpose.",
      "Missing contacts are flagged.",
    ],
  },
  {
    phase: "kickoff-ready",
    title: "Define project success criteria",
    priority: "P0",
    dueDate: "2026-07-13",
    description:
      "Agree on what a successful EBAC ticketing/project-management rollout means. Use this to prevent the launch from becoming only a technical deployment without clear operational outcomes.",
    checklist: [
      "Define operational goals",
      "Define reporting goals",
      "Define adoption expectations",
      "Define visibility expectations",
      "Define what should improve versus the current process",
      "Identify success metrics for first 30 days",
    ],
    acceptanceCriteria: [
      "Leadership agrees on 3 to 5 success criteria.",
      "Criteria are specific enough to validate after launch.",
      "Any open disagreements are captured as follow-up cards.",
    ],
  },
  // B. Discovery / Decisions
  {
    phase: "discovery-decisions",
    title: "Map current request and ticket workflow",
    priority: "P0",
    dueDate: "2026-07-13",
    description:
      "Document how EBAC requests, issues, and internal tasks are currently submitted, triaged, assigned, tracked, escalated, and closed.",
    checklist: [
      "Identify current intake channels",
      "Identify who triages new work",
      "Identify common request types",
      "Identify current bottlenecks",
      "Identify common failure points",
      "Identify current reporting gaps",
      "Identify what should change in the new workflow",
    ],
    acceptanceCriteria: [
      "Current-state workflow is documented.",
      "Pain points are captured.",
      "Desired future-state changes are identified.",
    ],
  },
  {
    phase: "discovery-decisions",
    title: "Define ticket types and categories",
    priority: "P0",
    dueDate: "2026-07-13",
    description:
      "Finalize the categories users will select when creating or triaging tickets.",
    notes:
      "Suggested categories:\n\n- General Support\n- Program Operations\n- Facilities\n- Finance / Billing\n- Administrative\n- External Partner\n- Urgent Issue\n- Reporting / Data\n- Access / Permission\n- Other",
    checklist: [
      "Review suggested categories",
      "Remove categories that are not needed",
      "Add missing EBAC-specific categories",
      "Decide whether categories should map to owners",
      "Decide whether categories should influence priority or SLA",
    ],
    acceptanceCriteria: [
      "Final category list is approved.",
      "Category definitions are clear enough for users.",
      "Any category-to-owner rules are documented.",
    ],
  },
  {
    phase: "discovery-decisions",
    title: "Define ticket status workflow",
    priority: "P0",
    dueDate: "2026-07-13",
    description:
      "Finalize the statuses that tickets/cards should move through from creation to completion.",
    notes:
      "Suggested statuses:\n\n- New\n- Triage\n- Assigned\n- In Progress\n- Waiting\n- Blocked\n- Done\n- Archived",
    checklist: [
      "Confirm status names",
      "Define what each status means",
      "Define who can move tickets between statuses",
      "Define when a ticket is considered blocked",
      "Define when a ticket is considered done",
      "Define when a ticket should be archived",
    ],
    acceptanceCriteria: [
      "Final status workflow is approved.",
      "Status definitions are documented.",
      "Blocked, done, and archived rules are clear.",
    ],
  },
  {
    phase: "discovery-decisions",
    title: "Define priority and SLA rules",
    priority: "P0",
    dueDate: "2026-07-13",
    description:
      "Agree on how EBAC will classify urgency and what expected response/resolution targets apply to each priority.",
    notes:
      "Suggested priorities:\n\n- Urgent\n- High\n- Normal\n- Low",
    checklist: [
      "Define urgent",
      "Define high",
      "Define normal",
      "Define low",
      "Decide response-time expectations",
      "Decide resolution-time expectations",
      "Decide escalation rules for overdue urgent/high tickets",
    ],
    acceptanceCriteria: [
      "Priority definitions are approved.",
      "SLA expectations are documented.",
      "Escalation rules are clear.",
    ],
  },
  {
    phase: "discovery-decisions",
    title: "Confirm roles and permissions",
    priority: "P0",
    dueDate: "2026-07-13",
    description:
      "Define who can create, assign, edit, comment, close, archive, view dashboards, and manage users.",
    checklist: [
      "Identify admin users",
      "Identify manager users",
      "Identify standard users",
      "Identify read-only users if needed",
      "Confirm who can create tickets",
      "Confirm who can assign tickets",
      "Confirm who can close tickets",
      "Confirm who can archive tickets",
      "Confirm who can view dashboards",
      "Confirm who can manage users",
    ],
    acceptanceCriteria: [
      "Permission model is approved.",
      "Initial access levels are documented.",
      "Any edge cases are captured.",
    ],
  },
  {
    phase: "discovery-decisions",
    title: "Decide who can create tickets",
    priority: "P1",
    dueDate: "2026-07-13",
    description:
      "Decide whether all users, managers only, admins only, or selected requestors can create tickets.",
    checklist: [
      "Review current intake channels and who submits work today",
      "List candidate creation rules (all users, managers, admins, selected requestors)",
      "Confirm exceptions for urgent or sensitive requests",
      "Document the approved creation rule",
    ],
    acceptanceCriteria: [
      "Ticket creation rule is documented.",
      "Any exceptions are captured.",
    ],
  },
  {
    phase: "discovery-decisions",
    title: "Decide who can assign tickets",
    priority: "P1",
    dueDate: "2026-07-13",
    description:
      "Decide whether assignment is limited to admins/managers or available to broader users.",
    checklist: [
      "Review who triages and assigns work today",
      "Decide whether assignees can reassign tickets",
      "Confirm whether team leads can assign within their team",
      "Document the approved assignment rule",
    ],
    acceptanceCriteria: [
      "Assignment rule is documented.",
      "Assignment permission aligns with EBAC workflow.",
    ],
  },
  {
    phase: "discovery-decisions",
    title: "Decide who can close tickets",
    priority: "P1",
    dueDate: "2026-07-13",
    description:
      "Decide whether tickets can be closed by the assignee, requester, manager, or admin only.",
    checklist: [
      "Define who can mark a ticket done or closed",
      "Decide whether requesters can close their own tickets",
      "Confirm reopen rules after closure",
      "Document the approved closure rule",
    ],
    acceptanceCriteria: [
      "Closure rule is documented.",
      "Reopen behavior is documented if needed.",
    ],
  },
  {
    phase: "discovery-decisions",
    title: "Decide dashboard audience",
    priority: "P1",
    dueDate: "2026-07-15",
    description:
      "Decide who should see operational dashboards and what information each audience should be able to view.",
    checklist: [
      "List dashboard audiences (leadership, managers, staff, read-only viewers)",
      "Identify metrics each audience needs",
      "Flag any sensitive data that should be restricted",
      "Document approved dashboard visibility rules",
    ],
    acceptanceCriteria: [
      "Dashboard audience is approved.",
      "Any sensitive visibility restrictions are documented.",
    ],
  },
  // C. Build / Configure
  {
    phase: "build-configure",
    title: "Build initial user and access list",
    priority: "P1",
    dueDate: "2026-07-15",
    description:
      "Collect names, emails, departments, roles, and permission levels for users who need access before launch.",
    checklist: [
      "Collect user names",
      "Collect email addresses",
      "Assign permission levels",
      "Identify admins",
      "Identify managers",
      "Identify standard users",
      "Identify read-only users if needed",
      "Confirm who needs access before pilot",
      "Confirm who can wait until full rollout",
    ],
    acceptanceCriteria: [
      "Initial access list is complete.",
      "Missing user information is flagged.",
      "Access list is ready for configuration.",
    ],
  },
  {
    phase: "build-configure",
    title: "Define notification rules",
    priority: "P1",
    dueDate: "2026-07-15",
    description:
      "Decide what events should generate notifications and who should receive them.",
    notes:
      "Suggested notification triggers:\n\n- New ticket assigned\n- Comment added\n- Status changed\n- Due date approaching\n- Ticket overdue\n- Ticket blocked\n- User mentioned\n- Ticket closed",
    checklist: [
      "Confirm required notification triggers",
      "Confirm recipients for each trigger",
      "Confirm whether email notifications are needed",
      "Confirm whether in-app notifications are sufficient",
      "Confirm notification volume concerns",
    ],
    acceptanceCriteria: [
      "Notification rules are documented.",
      "Trigger and recipient rules are clear.",
      "Any email requirements are captured.",
    ],
  },
  {
    phase: "build-configure",
    title: "Define dashboard and reporting needs",
    priority: "P1",
    dueDate: "2026-07-15",
    description:
      "Confirm what EBAC leadership and managers need to see on dashboards and reports.",
    notes:
      "Suggested dashboard items:\n\n- Open tickets\n- Due this week\n- Overdue tickets\n- Blocked tickets\n- Tickets by status\n- Open tickets by assignee\n- Tickets by category\n- Aging tickets\n- Recently completed tickets",
    checklist: [
      "Confirm required metrics",
      "Confirm dashboard audience",
      "Confirm export needs",
      "Confirm reporting cadence",
      "Confirm whether historical trends are needed",
    ],
    acceptanceCriteria: [
      "Reporting requirements are documented.",
      "Dashboard MVP is clearly defined.",
      "Nice-to-have reports are separated from launch requirements.",
    ],
  },
  // D. UAT / Validation
  {
    phase: "uat-validation",
    title: "Create UAT test scenarios",
    priority: "P1",
    dueDate: "2026-07-17",
    description:
      "Create acceptance tests for the EBAC rollout so pilot users can validate the system before go-live.",
    checklist: [
      "Test ticket creation",
      "Test ticket assignment",
      "Test status changes",
      "Test priority changes",
      "Test due dates",
      "Test comments",
      "Test filtering",
      "Test dashboard counts",
      "Test permissions",
      "Test archiving",
      "Test notifications if available",
    ],
    acceptanceCriteria: [
      "UAT scenarios cover core workflows.",
      "Each scenario has expected results.",
      "Failed scenarios can be logged as board cards.",
    ],
  },
  {
    phase: "uat-validation",
    title: "Select pilot users",
    priority: "P1",
    dueDate: "2026-07-17",
    description:
      "Identify a small group of EBAC users to validate the system before full rollout.",
    checklist: [
      "Select one admin/power user",
      "Select one manager/team lead",
      "Select one standard user",
      "Select one user likely to submit requests",
      "Confirm availability for UAT",
      "Confirm feedback expectations",
    ],
    acceptanceCriteria: [
      "Pilot user list is approved.",
      "Users understand their testing role.",
      "UAT timing is confirmed.",
    ],
  },
  {
    phase: "uat-validation",
    title: "Run pilot UAT and capture findings",
    priority: "P1",
    dueDate: "2026-07-22",
    description:
      "Have pilot users test the system and capture issues, confusion, missing fields, workflow problems, and improvement ideas.",
    checklist: [
      "Run through UAT scenarios",
      "Capture bugs",
      "Capture workflow gaps",
      "Capture training questions",
      "Capture dashboard/reporting gaps",
      "Separate blockers from nice-to-haves",
      "Assign owners for fixes",
    ],
    acceptanceCriteria: [
      "Pilot testing is complete.",
      "Findings are documented.",
      "Launch blockers are clearly identified.",
    ],
  },
  // E. Launch Prep
  {
    phase: "launch-prep",
    title: "Draft training guide and quick-start SOP",
    priority: "P1",
    dueDate: "2026-07-20",
    description:
      "Create a simple user guide for EBAC users explaining how to create, update, filter, assign, comment on, and close tickets.",
    checklist: [
      "Explain when to create a ticket",
      "Explain how to create a ticket",
      "Explain how to choose category and priority",
      "Explain how to assign or request assignment",
      "Explain how to update status",
      "Explain how to comment",
      "Explain how to close a ticket",
      "Explain how managers should use dashboards",
      "Add screenshots if practical",
    ],
    acceptanceCriteria: [
      "Guide is short enough for users to actually read.",
      "Core workflows are covered.",
      "Guide can be shared before launch.",
    ],
  },
  {
    phase: "launch-prep",
    title: "Define go-live criteria",
    priority: "P1",
    dueDate: "2026-07-20",
    description:
      "Agree on what must be true before EBAC moves from pilot/testing to live usage.",
    notes:
      "Suggested go-live criteria:\n\n- Stakeholders approved workflow\n- Roles and permissions configured\n- Initial users loaded\n- Ticket categories finalized\n- Status workflow finalized\n- Dashboard MVP working\n- UAT blockers resolved\n- Training guide ready\n- Support/feedback process defined",
    checklist: [
      "Confirm required launch criteria",
      "Separate launch blockers from post-launch improvements",
      "Assign owners for open blockers",
      "Confirm launch decision owner",
    ],
    acceptanceCriteria: [
      "Go-live checklist is approved.",
      "Launch blockers are visible.",
      "Decision owner is identified.",
    ],
  },
  {
    phase: "launch-prep",
    title: "Prepare launch communications",
    priority: "P2",
    dueDate: "2026-07-22",
    description:
      "Prepare the message that will tell EBAC users when and how to start using the project management/ticketing board.",
    checklist: [
      "Draft launch email/message",
      "Include system purpose",
      "Include who should use it",
      "Include what should be submitted",
      "Include quick-start guide link",
      "Include support contact",
      "Include launch date",
      "Include feedback instructions",
    ],
    acceptanceCriteria: [
      "Launch communication is drafted.",
      "EBAC lead approves message.",
      "Message is ready to send.",
    ],
  },
  // F. Post-Launch / Hypercare
  {
    phase: "post-launch-hypercare",
    title: "Create post-launch feedback channel",
    priority: "P2",
    dueDate: "2026-07-22",
    description:
      "Define where users should report issues, confusion, bugs, or suggested improvements after launch.",
    checklist: [
      "Decide where feedback should go",
      "Decide who triages feedback",
      "Decide how bugs become tickets",
      "Decide how enhancement requests are prioritized",
      "Decide expected response time during hypercare",
    ],
    acceptanceCriteria: [
      "Feedback process is documented.",
      "Users know where to report issues.",
      "Owner is assigned for triage.",
    ],
  },
  {
    phase: "post-launch-hypercare",
    title: "Schedule post-launch review",
    priority: "P2",
    dueDate: "2026-07-27",
    description:
      "Schedule a review after initial usage to identify adoption issues, process problems, reporting gaps, and needed enhancements.",
    checklist: [
      "Schedule review meeting",
      "Invite EBAC lead and pilot users",
      "Review ticket volume",
      "Review overdue/blocked tickets",
      "Review user feedback",
      "Review reporting gaps",
      "Decide next improvements",
    ],
    acceptanceCriteria: [
      "Review is scheduled.",
      "Review agenda is defined.",
      "Initial success metrics will be reviewed.",
    ],
  },
];
