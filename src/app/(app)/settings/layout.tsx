import { requireUser } from "@/lib/auth";
import { canManageProjects, canManageUsers } from "@/lib/rbac";
import { SettingsNav } from "@/components/settings/settings-nav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const canManage = canManageProjects(user.role);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {canManage
            ? "Manage projects, labels, reporting, users, and integrations."
            : "Manage your personal integrations."}
        </p>
      </div>
      <SettingsNav isAdmin={canManageUsers(user.role)} canManage={canManage} />
      {children}
    </div>
  );
}
