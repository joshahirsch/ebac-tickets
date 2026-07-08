"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Download, Trash2, Paperclip, Upload } from "lucide-react";
import {
  uploadAttachmentAction,
  getAttachmentUrlAction,
  deleteAttachmentAction,
} from "@/server/actions/attachments";
import type { ActionResult } from "@/server/actions/tickets";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Attachment = {
  id: string;
  fileName: string;
  sizeBytes: number;
  createdAt: Date;
  uploaderId: string | null;
  uploader: { id: string; name: string | null; email: string } | null;
};

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      <Upload className="h-4 w-4" />
      {pending ? "Uploading…" : "Upload"}
    </Button>
  );
}

export function AttachmentsSection({
  ticketId,
  attachments,
  canUpload,
  currentUserId,
  canManage,
}: {
  ticketId: string;
  attachments: Attachment[];
  canUpload: boolean;
  currentUserId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    uploadAttachmentAction,
    undefined,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const download = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      const res = await getAttachmentUrlAction(id);
      setBusyId(null);
      if (res.ok && res.url) window.open(res.url, "_blank", "noopener");
    });
  };

  const remove = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      await deleteAttachmentAction(id);
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <ul className="divide-y">
          {attachments.map((f) => {
            const canDelete = canManage || f.uploaderId === currentUserId;
            return (
              <li key={f.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{f.fileName}</span>
                    <span className="text-xs text-muted-foreground">
                      {f.uploader?.name ?? f.uploader?.email ?? "Unknown"} · {format(f.createdAt, "MMM d")} ·{" "}
                      {formatBytes(f.sizeBytes)}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => download(f.id)}
                    disabled={pending && busyId === f.id}
                    aria-label="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => remove(f.id)}
                      disabled={pending && busyId === f.id}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {canUpload ? (
        <form ref={formRef} action={formAction} className="flex items-center gap-2 pt-1">
          <input type="hidden" name="ticketId" value={ticketId} />
          <input
            type="file"
            name="file"
            required
            className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1 file:text-sm hover:file:bg-accent"
          />
          <UploadButton />
        </form>
      ) : null}

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <p className="text-xs text-muted-foreground">Max 10 MB per file.</p>
    </div>
  );
}
