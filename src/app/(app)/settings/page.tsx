import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canManageProjects } from "@/lib/rbac";

// Settings landing → managers to Projects; everyone else to Integrations.
export default async function SettingsPage() {
  const user = await requireUser();
  if (canManageProjects(user.role)) redirect("/settings/projects");
  redirect("/settings/integrations");
}
