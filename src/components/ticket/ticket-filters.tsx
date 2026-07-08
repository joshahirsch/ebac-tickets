"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
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
  { key: "my", label: "My tickets" },
  { key: "due-week", label: "Due this week" },
  { key: "overdue", label: "Overdue" },
  { key: "blocked", label: "Blocked" },
  { key: "high", label: "High priority" },
  { key: "recent", label: "Recently updated" },
];

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

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
  const hasFilters = Array.from(searchParams.keys()).some((k) => k !== "sort");

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get("q")?.toString() ?? "";
    setParam("q", value || null);
  };

  return (
    <div className="space-y-3">
      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((qf) => {
          const active = get("quick") === qf.key;
          return (
            <button
              key={qf.key}
              onClick={() => setParam("quick", active ? null : qf.key)}
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
        {/* Archived toggle — flips the status filter to ARCHIVED. */}
        {(() => {
          const archived = get("status") === "ARCHIVED";
          return (
            <button
              onClick={() => setParam("status", archived ? null : "ARCHIVED")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                archived
                  ? "border-slate-500 bg-slate-600 text-white"
                  : "border-dashed border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {archived ? "Viewing archived" : "Show archived"}
            </button>
          );
        })()}
      </div>

      {/* Search + selects */}
      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={onSearchSubmit} className="relative">
          <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={get("q")}
            placeholder="Search title or description…"
            className="h-8 w-56 pl-8"
          />
        </form>

        <select value={get("projectId")} onChange={(e) => setParam("projectId", e.target.value || null)} className={selectClass}>
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.key}
            </option>
          ))}
        </select>

        <select value={get("status")} onChange={(e) => setParam("status", e.target.value || null)} className={selectClass}>
          <option value="">All statuses</option>
          {TICKET_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {TICKET_STATUS_META[s].label}
            </option>
          ))}
        </select>

        <select value={get("priority")} onChange={(e) => setParam("priority", e.target.value || null)} className={selectClass}>
          <option value="">All priorities</option>
          {TICKET_PRIORITY_ORDER.map((p) => (
            <option key={p} value={p}>
              {TICKET_PRIORITY_META[p].label}
            </option>
          ))}
        </select>

        <select value={get("type")} onChange={(e) => setParam("type", e.target.value || null)} className={selectClass}>
          <option value="">All types</option>
          {TICKET_TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {TICKET_TYPE_META[t].label}
            </option>
          ))}
        </select>

        <select value={get("assigneeId")} onChange={(e) => setParam("assigneeId", e.target.value || null)} className={selectClass}>
          <option value="">All assignees</option>
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
