import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getProjectsWithCounts } from "@/server/queries/projects";
import { PROJECT_STATUS_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await getProjectsWithCounts(user.workspaceId);

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">{projects.length} project(s)</p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No projects yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const meta = PROJECT_STATUS_META[p.status];
            const total = p.openCount + p.doneCount;
            const pct = total > 0 ? Math.round((p.doneCount / total) * 100) : 0;
            return (
              <Link key={p.id} href={`/projects/${p.id}`} className="block">
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">
                        <span className="text-muted-foreground">{p.key}</span> · {p.name}
                      </CardTitle>
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium", meta.badge)}>
                        {meta.label}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {p.description || "No description."}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.category ?? "—"}</span>
                      <span>{p.owner ? `Owner: ${p.owner.name ?? p.owner.email}` : "No owner"}</span>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {p.openCount} open · {p.doneCount} done
                        </span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
