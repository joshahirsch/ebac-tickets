"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { addCommentAction } from "@/server/actions/comments";
import type { ActionResult } from "@/server/actions/tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Posting…" : "Comment"}
    </Button>
  );
}

export function CommentForm({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    addCommentAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <Textarea
        name="body"
        rows={3}
        placeholder="Add a comment… use @email to mention a teammate."
        required
      />
      <div className="flex items-center justify-between">
        {state?.error ? (
          <span className="text-sm text-destructive">{state.error}</span>
        ) : (
          <span />
        )}
        <SubmitButton />
      </div>
    </form>
  );
}
