"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Archive, RotateCcw } from "lucide-react";
import {
  createProjectAction,
  updateProjectAction,
  setProjectArchivedAction,
} from "@/server/actions/admin-projects";
import type { ActionResult } from "@/server/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Owner = { id: string; name: string | null; email: string };
type Project = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  ownerId: string | null;
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function OwnerSelect({ owners, name, defaultValue }: { owners: Owner[]; name: string; defaultValue?: string }) {
  return (
    <select id={name} name={name} defaultValue={defaultValue ?? ""} className={selectClass}>
      <option value="">No owner</option>
      {owners.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name ?? o.email}
        </option>
      ))}
    </select>
  );
}

function CreateSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create project"}
    </Button>
  );
}

export function NewProjectDialog({ owners }: { owners: Owner[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    createProjectAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Input id="key" name="key" required placeholder="OPS" maxLength={8} className="uppercase" />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required placeholder="Internal Operations" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="Internal / Client" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerId">Owner</Label>
              <OwnerSelect owners={owners} name="ownerId" />
            </div>
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <CreateSubmit />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditProjectDialog({ project, owners }: { project: Project; owners: Owner[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: project.name,
    description: project.description ?? "",
    category: project.category ?? "",
    status: project.status,
    ownerId: project.ownerId ?? "",
  });

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateProjectAction({
        id: project.id,
        name: form.name,
        description: form.description,
        category: form.category,
        status: form.status,
        ownerId: form.ownerId,
      });
      if (!res.ok) setError(res.error ?? "Failed.");
      else {
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit project">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {project.key}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={selectClass}
              >
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <select
              value={form.ownerId}
              onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              className={selectClass}
            >
              <option value="">No owner</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name ?? o.email}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ArchiveProjectButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = () => {
    startTransition(async () => {
      const res = await setProjectArchivedAction(id, !archived);
      if (res.ok) router.refresh();
    });
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={run}
      disabled={pending}
      aria-label={archived ? "Unarchive" : "Archive"}
      title={archived ? "Unarchive" : "Archive"}
    >
      {archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
    </Button>
  );
}
