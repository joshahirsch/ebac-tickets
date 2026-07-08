import type { Role } from "@prisma/client";
import { canArchiveTickets } from "@/lib/rbac";

/** Whether the tickets table should render archive selection/actions for this role. */
export function ticketTableShowsArchiveControls(role: Role | string): boolean {
  return canArchiveTickets(role);
}
