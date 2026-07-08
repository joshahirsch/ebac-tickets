"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { changeOwnPasswordAction } from "@/server/actions/account";
import type { ActionResult } from "@/server/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Updating…" : "Update password"}
    </Button>
  );
}

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [ok, setOk] = useState(false);
  const [state, formAction] = useFormState<ActionResult | undefined, FormData>(
    changeOwnPasswordAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setOk(true);
      const t = setTimeout(() => setOk(false), 4000);
      return () => clearTimeout(t);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {ok ? <p className="text-sm text-green-600">Password updated.</p> : null}
      <SubmitButton />
    </form>
  );
}
