"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TicketStatus, TicketPriority, TicketType } from "@prisma/client";
import { updateTicketAction } from "@/server/actions/tickets";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  TICKET_STATUS_ORDER,
  TICKET_STATUS_META,
  TICKET_PRIORITY_ORDER,
  TICKET_PRIORITY_META,
  TICKET_TYPE_ORDER,
  TICKET_TYPE_META,
} from "@/lib/constants";

type Assignee = { id: string; name: string | null; email: string };

function useTicketUpdate(ticketId: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (patch: Record<string, unknown>) => {
    setError(null);
    startTransition(async () => {
      const res = await updateTicketAction({ id: ticketId, ...patch } as never);
      if (!res.ok) setError(res.error ?? "Update failed.");
      else router.refresh();
    });
  };
  return { run, pending, error };
}

export function StatusSelect({
  ticketId,
  value,
  disabled,
}: {
  ticketId: string;
  value: TicketStatus;
  disabled?: boolean;
}) {
  const { run, pending } = useTicketUpdate(ticketId);
  return (
    <Select value={value} onValueChange={(v) => run({ status: v })} disabled={disabled || pending}>
      <SelectTrigger className="h-8 w-[150px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TICKET_STATUS_ORDER.map((s) => (
          <SelectItem key={s} value={s}>
            {TICKET_STATUS_META[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function PrioritySelect({
  ticketId,
  value,
  disabled,
}: {
  ticketId: string;
  value: TicketPriority;
  disabled?: boolean;
}) {
  const { run, pending } = useTicketUpdate(ticketId);
  return (
    <Select value={value} onValueChange={(v) => run({ priority: v })} disabled={disabled || pending}>
      <SelectTrigger className="h-8 w-[130px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TICKET_PRIORITY_ORDER.map((p) => (
          <SelectItem key={p} value={p}>
            {TICKET_PRIORITY_META[p].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function TypeSelect({
  ticketId,
  value,
  disabled,
}: {
  ticketId: string;
  value: TicketType;
  disabled?: boolean;
}) {
  const { run, pending } = useTicketUpdate(ticketId);
  return (
    <Select value={value} onValueChange={(v) => run({ type: v })} disabled={disabled || pending}>
      <SelectTrigger className="h-8 w-[150px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TICKET_TYPE_ORDER.map((t) => (
          <SelectItem key={t} value={t}>
            {TICKET_TYPE_META[t].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AssigneeSelect({
  ticketId,
  value,
  users,
  disabled,
}: {
  ticketId: string;
  value: string | null;
  users: Assignee[];
  disabled?: boolean;
}) {
  const { run, pending } = useTicketUpdate(ticketId);
  const UNASSIGNED = "__unassigned__";
  return (
    <Select
      value={value ?? UNASSIGNED}
      onValueChange={(v) => run({ assigneeId: v === UNASSIGNED ? "" : v })}
      disabled={disabled || pending}
    >
      <SelectTrigger className="h-8 w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {users.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name ?? u.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DueDateField({
  ticketId,
  value,
  disabled,
}: {
  ticketId: string;
  value: string | null; // yyyy-mm-dd
  disabled?: boolean;
}) {
  const { run, pending } = useTicketUpdate(ticketId);
  return (
    <Input
      type="date"
      defaultValue={value ?? ""}
      disabled={disabled || pending}
      className="h-8 w-[160px]"
      onChange={(e) => run({ dueDate: e.target.value })}
    />
  );
}
