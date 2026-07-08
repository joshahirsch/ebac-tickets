"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { quickToView } from "@/lib/ticket-list-search-params";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  TICKET_STATUS_ORDER,
  TICKET_STATUS_META,
  TICKET_PRIORITY_ORDER,
  TICKET_PRIORITY_META,
  TICKET_TYPE_ORDER,
  TICKET_TYPE_META,
} from "@/lib/constants";

type ProjectOption = { id: string; key: string; name: string };
type UserOption = { id: string; name: string | null; email: string };

const QUICK_FILTERS = [
  { key: "my", view: "my", label: "My tickets" },
  { key: "due-week", view: "due-this-week", label: "Due this week" },
  { key: "overdue", view: "overdue", label: "Overdue" },
  { key: "blocked", view: "blocked", label: "Blocked" },
  { key: "high", view: "high-priority", label: "High priority" },
  { key: "recent", view: "recently-updated", label: "Recently updated" },
];

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

const FILTER_KEYS = new Set([
  "q",
  "project",
  "projectId",
  "status",
  "priority",
  "type",
  "assignee",
  "assigneeId",
  "view",
  "quick",
  "archived",
  "labelId",
]);

export function TicketFilters({
  projects,
  users,
}: {
  projects: ProjectOption[];
  users: UserOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const get = (k: string) => searchParams.get(k) ?? "";

  const activeView = get("view") || (get("quick") ? quickToView(get("quick")) : "");
  const activeProject = get("project") || get("projectId");
  const activeAssignee = get("assignee") || get("assigneeId");
  const viewingArchived = get("archived") === "true" || get("status") === "ARCHIVED";

  const hasFilters = Array.from(searchParams.keys()).some((k) => FILTER_KEYS.has(k) && k !== "sort");

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get("q")?.toString() ?? "";
    setParam("q", value || null);
  };

  const toggleView = (view: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("quick");
    if (activeView === view) params.delete("view");
    else params.set("view", view);
    router.push(`${pathname}?${params.toString()}`);
  };

  const setFilterParam = (key: string, value: string | null, legacyKey?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (legacyKey) params.delete(legacyKey);
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-3">
      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((qf) => {
          const active = activeView === qf.view;
          return (
            <button
              key={qf.view}
              onClick={() => toggleView(qf.view)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {qf.label}
            </button>
          );
        })}
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            if (viewingArchived) {
              params.delete("archived");
              if (params.get("status") === "ARCHIVED") params.delete("status");
            } else {
              params.delete("status");
              params.set("archived", "true");
            }
            router.push(`${pathname}?${params.toString()}`);
          }}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            viewingArchived
              ? "border-slate-500 bg-slate-600 text-white"
              : "border-dashed border-border bg-background text-muted-foreground hover:bg-accent",
          )}
        >
          {viewingArchived ? "Viewing archived" : "Show archived"}
        </button>
      </div>

      {/* Search + selects */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={onSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            key={`q-${get("q")}`}
            name="q"
            defaultValue={get("q")}
            placeholder="Search title or description…"
            className="h-8 w-56 pl-8"
          />
        </form>

        <select
          value={activeProject}
          onChange={(e) => setFilterParam("project", e.target.value || null, "projectId")}
          className={selectClass}
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.key}
            </option>
          ))}
        </select>

        <select
          value={get("status") === "ARCHIVED" ? "" : get("status")}
          onChange={(e) => setFilterParam("status", e.target.value || null)}
          className={selectClass}
        >
          <option value="">All statuses</option>
          {TICKET_STATUS_ORDER.filter((s) => s !== "ARCHIVED").map((s) => (
            <option key={s} value={s}>
              {TICKET_STATUS_META[s].label}
            </option>
          ))}
        </select>

        <select
          value={get("priority")}
          onChange={(e) => setFilterParam("priority", e.target.value || null)}
          className={selectClass}
        >
          <option value="">All priorities</option>
          {TICKET_PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {TICKET_PRIORITY_META[p].label}
            </option>
          ))}
        </select>

        <select
          value={get("type")}
          onChange={(e) => setFilterParam("type", e.target.value || null)}
          className={selectClass}
        >
          <option value="">All types</option>
          {TICKET_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {TICKET_TYPE_META[t].label}
            </option>
          ))}
        </select>

        <select
          value={activeAssignee}
          onChange={(e) => setFilterParam("assignee", e.target.value || null, "assigneeId")}
          className={selectClass}
        >
          <option value="">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name ?? u.email}
            </option>
          ))}
        </select>

        {hasFilters ? (
          <Button variant="ghost" size="sm" className="h-8" onClick={() => router.push(pathname)}>
            <X className="h-4 w-4" />
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
