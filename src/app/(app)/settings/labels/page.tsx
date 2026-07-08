import { requireRole } from "@/lib/auth";
import { getLabelsWithUsage } from "@/server/queries/admin";
import { LabelManager } from "@/components/settings/label-manager";

export const dynamic = "force-dynamic";

export default async function LabelsSettingsPage() {
  const user = await requireRole(["ADMIN", "MANAGER"]);
  const labels = await getLabelsWithUsage(user.workspaceId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Labels</h2>
        <p className="text-sm text-muted-foreground">
          Labels are shared across the workspace and can be applied to any ticket.
        </p>
      </div>
      <LabelManager labels={labels} />
    </div>
  );
}
