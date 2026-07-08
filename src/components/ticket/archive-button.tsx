"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, RotateCcw } from "lucide-react";
import { archiveTicketAction, reopenTicketAction } from "@/server/actions/tickets";
import { Button } from "@/components/ui/button";

export function ArchiveButton({
  ticketId,
  isArchived,
}: {
  ticketId: string;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const res = isArchived
        ? await reopenTicketAction(ticketId)
        : await archiveTicketAction(ticketId);
      if (res.ok) router.refresh();
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={run} disabled={pending}>
      {isArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
      {isArchived ? "Reopen" : "Archive"}
    </Button>
  );
}
