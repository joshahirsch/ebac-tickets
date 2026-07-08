"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { updateUserRoleAction, setUserActiveAction } from "@/server/actions/admin-users";
import { ResetPasswordDialog } from "@/components/settings/reset-password-dialog";
import { Button } from "@/components/ui/button";

const selectClass =
  "h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50";

export function UserRowActions({
  userId,
  role,
  isActive,
  isSelf,
  label,
  canResetPassword,
}: {
  userId: string;
  role: Role;
  isActive: boolean;
  isSelf: boolean;
  label: string;
  canResetPassword: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const changeRole = (next: string) => {
    setError(null);
    startTransition(async () => {
      const res = await updateUserRoleAction(userId, next);
      if (!res.ok) setError(res.error ?? "Failed.");
      else router.refresh();
    });
  };

  const toggleActive = () => {
    setError(null);
    startTransition(async () => {
      const res = await setUserActiveAction(userId, !isActive);
      if (!res.ok) setError(res.error ?? "Failed.");
      else router.refresh();
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
      {canResetPassword ? <ResetPasswordDialog userId={userId} label={label} /> : null}
      <select
        value={role}
        onChange={(e) => changeRole(e.target.value)}
        disabled={pending}
        className={selectClass}
        aria-label="Role"
      >
        <option value="ADMIN">Admin</option>
        <option value="MANAGER">Manager</option>
        <option value="MEMBER">Member</option>
        <option value="VIEWER">Viewer</option>
      </select>
      <Button
        variant="outline"
        size="sm"
        onClick={toggleActive}
        disabled={pending || isSelf}
        title={isSelf ? "You can't change your own status" : undefined}
      >
        {isActive ? "Deactivate" : "Activate"}
      </Button>
    </div>
  );
}
