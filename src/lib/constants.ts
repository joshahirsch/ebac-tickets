import type { TicketStatus, TicketPriority, TicketType, ProjectStatus } from "@prisma/client";

/**
 * Central display metadata for enums. Colors are Tailwind class fragments so
 * badges stay consistent everywhere. Kept in one file so adding/renaming a
 * status is a single edit.
 */

export const TICKET_STATUS_META: Record<
  TicketStatus,
  { label: string; badge: string; column: boolean }
> = {
  BACKLOG: { label: "Backlog", badge: "bg-slate-100 text-slate-700 border-slate-200", column: true },
  TODO: { label: "To Do", badge: "bg-blue-100 text-blue-700 border-blue-200", column: true },
  IN_PROGRESS: { label: "In Progress", badge: "bg-amber-100 text-amber-800 border-amber-200", column: true },
  BLOCKED: { label: "Blocked", badge: "bg-red-100 text-red-700 border-red-200", column: true },
  IN_REVIEW: { label: "In Review", badge: "bg-purple-100 text-purple-700 border-purple-200", column: true },
  DONE: { label: "Done", badge: "bg-green-100 text-green-700 border-green-200", column: true },
  ARCHIVED: { label: "Archived", badge: "bg-slate-100 text-slate-500 border-slate-200", column: false },
};

// Order used for board columns and status pickers.
export const TICKET_STATUS_ORDER: TicketStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "DONE",
  "ARCHIVED",
];

// Statuses that count as "open" (not done/archived).
export const OPEN_STATUSES: TicketStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW"];

export const TICKET_PRIORITY_META: Record<
  TicketPriority,
  { label: string; badge: string; weight: number }
> = {
  LOW: { label: "Low", badge: "bg-slate-100 text-slate-600 border-slate-200", weight: 1 },
  MEDIUM: { label: "Medium", badge: "bg-sky-100 text-sky-700 border-sky-200", weight: 2 },
  HIGH: { label: "High", badge: "bg-orange-100 text-orange-700 border-orange-200", weight: 3 },
  URGENT: { label: "Urgent", badge: "bg-red-100 text-red-700 border-red-200", weight: 4 },
};

export const TICKET_PRIORITY_ORDER: TicketPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

export const TICKET_TYPE_META: Record<TicketType, { label: string }> = {
  TASK: { label: "Task" },
  MILESTONE: { label: "Milestone" },
  EVENT: { label: "Event" },
  REQUEST: { label: "Request" },
  MAINTENANCE: { label: "Maintenance" },
  OTHER: { label: "Other" },
};

export const TICKET_TYPE_ORDER: TicketType[] = [
  "TASK",
  "MILESTONE",
  "EVENT",
  "REQUEST",
  "MAINTENANCE",
  "OTHER",
];

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; badge: string }> = {
  ACTIVE: { label: "Active", badge: "bg-green-100 text-green-700 border-green-200" },
  PAUSED: { label: "Paused", badge: "bg-amber-100 text-amber-800 border-amber-200" },
  COMPLETED: { label: "Completed", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  ARCHIVED: { label: "Archived", badge: "bg-slate-100 text-slate-500 border-slate-200" },
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/tickets", label: "Tickets", icon: "Ticket" },
  { href: "/board", label: "Board", icon: "Columns3" },
  { href: "/calendar", label: "Calendar", icon: "CalendarDays" },
  { href: "/projects", label: "Projects", icon: "FolderKanban" },
  { href: "/my-work", label: "My Work", icon: "CircleUser" },
  { href: "/notifications", label: "Notifications", icon: "Bell" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;
