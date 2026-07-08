import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { getProjects, getAssignableUsers, getLabels } from "@/server/queries/lookups";
import { NewTicketForm } from "@/components/ticket/new-ticket-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: { projectId?: string };
}) {
  const user = await requireUser();
  if (!can(user.role, "ticket:create")) redirect("/tickets");

  const [projects, users, labels] = await Promise.all([
    getProjects(user.workspaceId),
    getAssignableUsers(user.workspaceId),
    getLabels(user.workspaceId),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
        <Link href="/tickets">
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>New ticket</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No projects yet. An admin or manager needs to create a project first.
            </p>
          ) : (
            <NewTicketForm
              projects={projects.map((p) => ({ id: p.id, key: p.key, name: p.name }))}
              users={users}
              labels={labels}
              defaultProjectId={searchParams.projectId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
