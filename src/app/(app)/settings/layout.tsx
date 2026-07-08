import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canManageProjects, canManageUsers } from "@/lib/rbac";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  // Managers and admins reach settings; members/viewers are redirected.
  if (!canManageProjects(user.role)) redirect("/dashboard?forbidden=1");

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage projects, labels, reporting, and users.</p>
      </div>
      <SettingsNav isAdmin={canManageUsers(user.role)} />
      {children}
    </div>
  );
}
