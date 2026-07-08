"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { createUserAction } from "@/server/actions/admin-users";
import type { ActionResult } from "@/server/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create user"}
    </Button>
  );
}

export function AddUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    createUserAction,
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
          <UserPlus className="h-4 w-4" />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
          <DialogDescription>
            Creates a login and grants access. Share the password with them securely.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-email">Email</Label>
            <Input id="new-email" name="email" type="email" required placeholder="jordan@ebac.org" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-name">Name</Label>
            <Input id="new-name" name="name" placeholder="Mike" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <select id="new-role" name="role" defaultValue="MEMBER" className={selectClass}>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Temp password</Label>
              <Input id="new-password" name="password" type="text" required minLength={8} placeholder="min 8 chars" />
            </div>
          </div>
          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
