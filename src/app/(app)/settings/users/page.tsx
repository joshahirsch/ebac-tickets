import { format } from "date-fns";
import { requireRole } from "@/lib/auth";
import { getAllUsers } from "@/server/queries/admin";
import { AddUserDialog } from "@/components/settings/add-user-dialog";
import { UserRowActions } from "@/components/settings/user-row-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  const admin = await requireRole(["ADMIN"]);
  const users = await getAllUsers(admin.workspaceId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Users</h2>
          <p className="text-sm text-muted-foreground">{users.length} member(s)</p>
        </div>
        <AddUserDialog />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Open</TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
              <TableHead className="hidden lg:table-cell">Added</TableHead>
              <TableHead className="text-right">Role &amp; access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className={cn(!u.isActive && "opacity-60")}>
                <TableCell className="font-medium">
                  {u.name ?? "—"}
                  {!u.authId ? (
                    <span className="ml-2 rounded-full border px-1.5 text-[10px] text-muted-foreground">
                      not signed in
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                <TableCell className="hidden text-sm md:table-cell">{u.openTickets}</TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs",
                      u.isActive
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-slate-100 text-slate-600 border-slate-200",
                    )}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {format(u.createdAt, "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <UserRowActions
                    userId={u.id}
                    role={u.role}
                    isActive={u.isActive}
                    isSelf={u.id === admin.id}
                    label={u.name ?? u.email}
                    canResetPassword={Boolean(u.authId)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        New users are created with a confirmed login and can sign in immediately. Deactivating a
        user blocks their access on the next request.
      </p>
    </div>
  );
}
