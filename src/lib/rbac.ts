import type { Role } from "@prisma/client";

/**
 * Centralized role-based access control.
 *
 * Roles (most → least privileged):
 *   ADMIN   — manage everything (users, roles, projects, tickets, settings).
 *   MANAGER — manage projects, tickets, assignments, statuses, labels.
 *   MEMBER  — create tickets; update/comment on tickets they can access.
 *   VIEWER  — read-only.
 *
 * Keep every gate in this file so permissions are auditable in one place.
 */

export type Permission =
  | "ticket:create"
  | "ticket:update"
  | "ticket:archive"
  | "ticket:comment"
  | "ticket:assign"
  | "project:create"
  | "project:update"
  | "project:archive"
  | "label:manage"
  | "user:manage"
  | "settings:manage";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    "ticket:create",
    "ticket:update",
    "ticket:archive",
    "ticket:comment",
    "ticket:assign",
    "project:create",
    "project:update",
    "project:archive",
    "label:manage",
    "user:manage",
    "settings:manage",
  ],
  MANAGER: [
    "ticket:create",
    "ticket:update",
    "ticket:archive",
    "ticket:comment",
    "ticket:assign",
    "project:create",
    "project:update",
    "project:archive",
    "label:manage",
  ],
  MEMBER: ["ticket:create", "ticket:update", "ticket:comment"],
  VIEWER: [],
};

/** True if the role holds the given permission. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Throwing variant for use in server actions. */
export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) {
    throw new PermissionError(permission);
  }
}

export class PermissionError extends Error {
  constructor(permission: Permission) {
    super(`Not permitted: ${permission}`);
    this.name = "PermissionError";
  }
}

/** Convenience helpers used in UI to hide/disable controls. */
export const isReadOnly = (role: Role) => role === "VIEWER";
export const canManageProjects = (role: Role) => can(role, "project:update");
export const canManageUsers = (role: Role) => can(role, "user:manage");
