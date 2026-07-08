"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check } from "lucide-react";
import {
  createLabelAction,
  updateLabelAction,
  deleteLabelAction,
} from "@/server/actions/admin-labels";
import type { ActionResult } from "@/server/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LabelRow = { id: string; name: string; color: string; _count: { tickets: number } };

function AddSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Plus className="h-4 w-4" />
      Add
    </Button>
  );
}

function LabelRowEditor({ label }: { label: LabelRow }) {
  const router = useRouter();
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dirty = name !== label.name || color !== label.color;

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateLabelAction(label.id, name, color);
      if (!res.ok) setError(res.error ?? "Failed.");
      else router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await deleteLabelAction(label.id);
      if (!res.ok) setError(res.error ?? "Failed.");
      else router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-2 py-2">
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="h-8 w-10 cursor-pointer rounded border"
        aria-label="Color"
      />
      <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 max-w-xs" />
      <span className="w-24 text-xs text-muted-foreground">{label._count.tickets} ticket(s)</span>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={save}
          disabled={pending || !dirty}
        >
          <Check className="h-4 w-4" />
          Save
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={remove}
          disabled={pending}
          aria-label="Delete label"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function LabelManager({ labels }: { labels: LabelRow[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    createLabelAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Color</label>
          <input type="color" name="color" defaultValue="#2563eb" className="block h-9 w-12 cursor-pointer rounded border" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Name</label>
          <Input name="name" placeholder="new-label" required className="w-56" />
        </div>
        <AddSubmit />
        {state?.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
      </form>

      <div className="divide-y rounded-lg border bg-card px-3">
        {labels.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No labels yet.</p>
        ) : (
          labels.map((l) => <LabelRowEditor key={l.id} label={l} />)
        )}
      </div>
    </div>
  );
}
