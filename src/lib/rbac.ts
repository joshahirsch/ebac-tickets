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

const ROLE_VALUES = new Set<Role>(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]);

/** Coerce persisted/session role strings to a known Role, if possible. */
export function normalizeRole(role: Role | string): Role | null {
  const normalized = String(role).trim().toUpperCase();
  return ROLE_VALUES.has(normalized as Role) ? (normalized as Role) : null;
}

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
export function can(role: Role | string, permission: Permission): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  return ROLE_PERMISSIONS[normalized].includes(permission);
}

/** Throwing variant for use in server actions. */
export function assertCan(role: Role | string, permission: Permission): void {
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
export const canArchiveTickets = (role: Role | string) => can(role, "ticket:archive");
export const canManageProjects = (role: Role) => can(role, "project:update");
export const canManageUsers = (role: Role) => can(role, "user:manage");
