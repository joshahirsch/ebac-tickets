import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isReadOnly } from "@/lib/rbac";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const notificationCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            EB
          </div>
          <span className="font-semibold">EBAC Projects</span>
        </div>
        <AppSidebar notificationCount={notificationCount} />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
          <div className="text-sm text-muted-foreground md:hidden">EBAC Projects</div>
          <div className="ml-auto flex items-center gap-3">
            {!isReadOnly(user.role) ? (
              <Button asChild size="sm">
                <Link href="/tickets/new">
                  <Plus className="h-4 w-4" />
                  New ticket
                </Link>
              </Button>
            ) : null}
            <UserMenu name={user.name ?? ""} email={user.email} role={user.role} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
