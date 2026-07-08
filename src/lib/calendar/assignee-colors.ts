export type AssigneeColorInput = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
} | null;

export const UNASSIGNED_ASSIGNEE_KEY = "unassigned";
export const UNASSIGNED_DISPLAY_NAME = "Unassigned";

export type AssigneeColorClasses = {
  pill: string;
  swatch: string;
};

/** Tinted palette with readable text and a strong left-edge accent. */
const ASSIGNEE_COLOR_PALETTE: AssigneeColorClasses[] = [
  {
    pill: "bg-blue-100 text-blue-950 border-l-blue-600 hover:bg-blue-200",
    swatch: "bg-blue-600",
  },
  {
    pill: "bg-amber-100 text-amber-950 border-l-amber-600 hover:bg-amber-200",
    swatch: "bg-amber-600",
  },
  {
    pill: "bg-emerald-100 text-emerald-950 border-l-emerald-600 hover:bg-emerald-200",
    swatch: "bg-emerald-600",
  },
  {
    pill: "bg-violet-100 text-violet-950 border-l-violet-600 hover:bg-violet-200",
    swatch: "bg-violet-600",
  },
  {
    pill: "bg-rose-100 text-rose-950 border-l-rose-600 hover:bg-rose-200",
    swatch: "bg-rose-600",
  },
  {
    pill: "bg-cyan-100 text-cyan-950 border-l-cyan-700 hover:bg-cyan-200",
    swatch: "bg-cyan-700",
  },
  {
    pill: "bg-orange-100 text-orange-950 border-l-orange-600 hover:bg-orange-200",
    swatch: "bg-orange-600",
  },
  {
    pill: "bg-teal-100 text-teal-950 border-l-teal-700 hover:bg-teal-200",
    swatch: "bg-teal-700",
  },
];

const UNASSIGNED_COLOR_CLASSES: AssigneeColorClasses = {
  pill: "bg-slate-200 text-slate-800 border-l-slate-500 hover:bg-slate-300",
  swatch: "bg-slate-500",
};

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function normalizeText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Stable key for color lookup: id, then email, then name, else unassigned. */
export function getAssigneeColorKey(assignee: AssigneeColorInput): string {
  if (!assignee) return UNASSIGNED_ASSIGNEE_KEY;

  const id = normalizeText(assignee.id);
  if (id) return id;

  const email = normalizeText(assignee.email);
  if (email) return email.toLowerCase();

  const name = normalizeText(assignee.name);
  if (name) return name.toLowerCase();

  return UNASSIGNED_ASSIGNEE_KEY;
}

export function getAssigneeDisplayName(assignee: AssigneeColorInput): string {
  if (!assignee) return UNASSIGNED_DISPLAY_NAME;

  const name = normalizeText(assignee.name);
  if (name) return name;

  const email = normalizeText(assignee.email);
  if (email) return email;

  return UNASSIGNED_DISPLAY_NAME;
}

/** Deterministic palette entry for an assignee (or unassigned fallback). */
export function getAssigneeColorClasses(assignee: AssigneeColorInput): AssigneeColorClasses {
  const key = getAssigneeColorKey(assignee);
  if (key === UNASSIGNED_ASSIGNEE_KEY) return UNASSIGNED_COLOR_CLASSES;

  const index = hashString(key) % ASSIGNEE_COLOR_PALETTE.length;
  return ASSIGNEE_COLOR_PALETTE[index]!;
}

export type AssigneeLegendItem = {
  key: string;
  displayName: string;
  count: number;
  colors: AssigneeColorClasses;
};

/** Build legend rows for visible tickets, sorted A–Z with Unassigned last. */
export function buildAssigneeLegendItems(
  tickets: { assignee: AssigneeColorInput }[],
): AssigneeLegendItem[] {
  const byKey = new Map<
    string,
    { displayName: string; count: number; assignee: AssigneeColorInput }
  >();

  for (const ticket of tickets) {
    const key = getAssigneeColorKey(ticket.assignee);
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byKey.set(key, {
      displayName: getAssigneeDisplayName(ticket.assignee),
      count: 1,
      assignee: ticket.assignee,
    });
  }

  const items = Array.from(byKey.entries()).map(([key, value]) => ({
    key,
    displayName: value.displayName,
    count: value.count,
    colors: getAssigneeColorClasses(value.assignee),
  }));

  items.sort((a, b) => {
    if (a.key === UNASSIGNED_ASSIGNEE_KEY) return 1;
    if (b.key === UNASSIGNED_ASSIGNEE_KEY) return -1;
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" });
  });

  return items;
}
