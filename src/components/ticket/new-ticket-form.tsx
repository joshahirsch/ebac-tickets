"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createTicketAndRedirect, type ActionResult } from "@/server/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  TICKET_STATUS_ORDER,
  TICKET_STATUS_META,
  TICKET_PRIORITY_ORDER,
  TICKET_PRIORITY_META,
  TICKET_TYPE_ORDER,
  TICKET_TYPE_META,
} from "@/lib/constants";

type Option = { id: string; name: string | null; email?: string };
type ProjectOption = { id: string; key: string; name: string };
type LabelOption = { id: string; name: string; color: string };

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create ticket"}
    </Button>
  );
}

/**
 * Native <select> elements are used here (rather than the Radix Select) so the
 * form posts reliably via FormData and supports an empty "Unassigned" value.
 */
export function NewTicketForm({
  projects,
  users,
  labels,
  defaultProjectId,
}: {
  projects: ProjectOption[];
  users: Option[];
  labels: LabelOption[];
  defaultProjectId?: string;
}) {
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    createTicketAndRedirect,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Short, specific summary" required autoFocus />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={5} placeholder="Context, acceptance criteria, links…" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <select id="projectId" name="projectId" required defaultValue={defaultProjectId ?? projects[0]?.id} className={cn(selectClass)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.key} · {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select id="type" name="type" defaultValue="TASK" className={cn(selectClass)}>
            {TICKET_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {TICKET_TYPE_META[t].label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select id="priority" name="priority" defaultValue="MEDIUM" className={cn(selectClass)}>
            {TICKET_PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {TICKET_PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" defaultValue="BACKLOG" className={cn(selectClass)}>
            {TICKET_STATUS_ORDER.filter((s) => s !== "ARCHIVED").map((s) => (
              <option key={s} value={s}>
                {TICKET_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigneeId">Assignee</Label>
          <select id="assigneeId" name="assigneeId" defaultValue="" className={cn(selectClass)}>
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ?? u.email}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>

      {labels.length > 0 ? (
        <div className="space-y-2">
          <Label>Labels</Label>
          <div className="flex flex-wrap gap-3">
            {labels.map((l) => (
              <label key={l.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input type="checkbox" name="labelIds" value={l.id} className="accent-primary" />
                <span
                  className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                  style={{ borderColor: l.color, color: l.color }}
                >
                  {l.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}
