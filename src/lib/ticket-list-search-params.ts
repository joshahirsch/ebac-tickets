export type TicketListParams = {
  q?: string;
  status?: string;
  priority?: string;
  type?: string;
  projectId?: string;
  assigneeId?: string;
  labelId?: string;
  quick?: string;
  sort?: string;
  includeArchived?: boolean;
};

export type TicketSearchParamsRecord = Record<string, string | string[] | undefined>;

/** Maps canonical `view` values to internal quick-filter keys. */
const VIEW_TO_QUICK: Record<string, TicketListParams["quick"]> = {
  my: "my",
  "due-this-week": "due-week",
  overdue: "overdue",
  blocked: "blocked",
  "high-priority": "high",
  "recently-updated": "recent",
};

const QUICK_TO_VIEW: Record<string, string> = {
  my: "my",
  "due-week": "due-this-week",
  overdue: "overdue",
  blocked: "blocked",
  high: "high-priority",
  recent: "recently-updated",
};

function first(sp: TicketSearchParamsRecord, key: string): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

/** Normalize URL sort tokens (`updated-desc`) to internal `field:dir` form. */
export function normalizeSortParam(sort?: string): string | undefined {
  if (!sort) return undefined;
  if (sort.includes(":")) return sort;

  const SORT_ALIASES: Record<string, string> = {
    "updated-desc": "updatedAt:desc",
    "updated-asc": "updatedAt:asc",
    "created-desc": "createdAt:desc",
    "created-asc": "createdAt:asc",
  };
  if (SORT_ALIASES[sort]) return SORT_ALIASES[sort];

  const lastDash = sort.lastIndexOf("-");
  if (lastDash <= 0) return sort;
  const field = sort.slice(0, lastDash);
  const dir = sort.slice(lastDash + 1);
  if (dir === "asc" || dir === "desc") return `${field}:${dir}`;
  return sort;
}

export function parseTicketListSearchParams(
  sp: TicketSearchParamsRecord,
  currentUserId: string,
): { params: TicketListParams; currentSort: string; viewingArchived: boolean } {
  const archivedParam = first(sp, "archived");
  const statusParam = first(sp, "status");
  const viewingArchived = archivedParam === "true" || statusParam === "ARCHIVED";

  let quick = first(sp, "quick");
  const view = first(sp, "view");
  if (view) {
    quick = VIEW_TO_QUICK[view] ?? quick;
  }

  let assignee = first(sp, "assignee") ?? first(sp, "assigneeId");
  if (assignee === "me") assignee = currentUserId;

  let sort = normalizeSortParam(first(sp, "sort"));
  if ((quick === "recent" || view === "recently-updated") && !sort) {
    sort = "updatedAt:desc";
  }

  const params: TicketListParams = {
    q: first(sp, "q"),
    status: viewingArchived && statusParam !== "ARCHIVED" ? undefined : statusParam,
    priority: first(sp, "priority"),
    type: first(sp, "type"),
    projectId: first(sp, "project") ?? first(sp, "projectId"),
    assigneeId: assignee,
    labelId: first(sp, "labelId"),
    quick,
    sort,
    includeArchived: viewingArchived,
  };

  return {
    params,
    currentSort: sort ?? "updatedAt:desc",
    viewingArchived,
  };
}

/** Canonical view key for a quick-filter pill (used by filter UI). */
export function quickToView(quick: string): string {
  return QUICK_TO_VIEW[quick] ?? quick;
}

/** Quick-filter key for a canonical view param (used by filter UI). */
export function viewToQuick(view: string): string | undefined {
  return VIEW_TO_QUICK[view];
}
