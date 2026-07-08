"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Pencil } from "lucide-react";
import { updateCommentAction } from "@/server/actions/comments";
import { CommentBody } from "@/components/ticket/comment-body";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/lib/utils";

type CommentAuthor = {
  id: string;
  name: string | null;
  email: string;
} | null;

export function CommentItem({
  comment,
  canEdit,
}: {
  comment: {
    id: string;
    body: string;
    isEdited: boolean;
    createdAt: Date;
    author: CommentAuthor;
  };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const authorLabel = comment.author?.name ?? comment.author?.email ?? "Unknown";
  const saveDisabled = pending || draft.trim().length === 0;

  const save = () => {
    if (saveDisabled) return;
    setError(null);
    startTransition(async () => {
      const res = await updateCommentAction({ commentId: comment.id, body: draft });
      if (!res.ok) {
        setError(res.error ?? "Update failed.");
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  const cancel = () => {
    setDraft(comment.body);
    setError(null);
    setEditing(false);
  };

  return (
    <li className="flex gap-3">
      <Avatar className="h-7 w-7">
        <AvatarFallback>{initials(authorLabel)}</AvatarFallback>
      </Avatar>
      <div className="group min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{authorLabel}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
          </span>
          {comment.isEdited ? (
            <span className="text-xs text-muted-foreground">(edited)</span>
          ) : null}
          {canEdit && !editing ? (
            <button
              type="button"
              onClick={() => {
                setDraft(comment.body);
                setEditing(true);
              }}
              className="ml-auto text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Edit comment"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
              className="text-sm"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saveDisabled}>
                {pending ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancel} disabled={pending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <CommentBody text={comment.body} />
        )}
      </div>
    </li>
  );
}
