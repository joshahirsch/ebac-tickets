import { requireUser } from "@/lib/auth";
import { getProjectsWithCounts } from "@/server/queries/projects";
import { getAssignableUsers } from "@/server/queries/lookups";
import { PROJECT_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  NewProjectDialog,
  EditProjectDialog,
  ArchiveProjectButton,
} from "@/components/settings/project-dialogs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ProjectsSettingsPage() {
  const user = await requireUser();
  const [projects, owners] = await Promise.all([
    getProjectsWithCounts(user.workspaceId),
    getAssignableUsers(user.workspaceId),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Projects</h2>
          <p className="text-sm text-muted-foreground">{projects.length} project(s)</p>
        </div>
        <NewProjectDialog owners={owners} />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Owner</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Tickets</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => {
              const meta = PROJECT_STATUS_META[p.status];
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.key}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {p.owner ? (p.owner.name ?? p.owner.email) : "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs", meta.badge)}>
                      {meta.label}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {p.openCount} open · {p.doneCount} done
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <EditProjectDialog
                        project={{
                          id: p.id,
                          key: p.key,
                          name: p.name,
                          description: p.description,
                          category: p.category,
                          status: p.status,
                          ownerId: p.ownerId,
                        }}
                        owners={owners}
                      />
                      <ArchiveProjectButton id={p.id} archived={p.status === "ARCHIVED"} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
