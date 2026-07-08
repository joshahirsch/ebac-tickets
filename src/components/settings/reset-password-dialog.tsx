"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { adminSetUserPasswordAction } from "@/server/actions/admin-users";
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

export function ResetPasswordDialog({ userId, label }: { userId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await adminSetUserPasswordAction(userId, password);
      if (!res.ok) setError(res.error ?? "Failed.");
      else {
        setDone(true);
        setPassword("");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setError(null);
          setDone(false);
          setPassword("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" title="Set password">
          <KeyRound className="h-4 w-4" />
          Password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set password</DialogTitle>
          <DialogDescription>
            Set a new password for {label}. Share it with them securely; they can change it later
            from their Account page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="reset-pw">New password</Label>
            <Input
              id="reset-pw"
              type="text"
              value={password}
              minLength={8}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="min 8 characters"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {done ? <p className="text-sm text-green-600">Password updated.</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Close
            </Button>
            <Button onClick={save} disabled={pending || password.length < 8}>
              {pending ? "Saving…" : "Set password"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
