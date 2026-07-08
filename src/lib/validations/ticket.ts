import { z } from "zod";
import { parseFormDateOnly } from "@/lib/date/date-only";

// Enum values kept in sync with the Prisma schema. Using z.enum keeps the DB
// as the source of truth for allowed values while validating at the edge.
export const ticketStatusEnum = z.enum([
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "IN_REVIEW",
  "DONE",
  "ARCHIVED",
]);

export const ticketPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const ticketTypeEnum = z.enum([
  "TASK",
  "MILESTONE",
  "EVENT",
  "REQUEST",
  "MAINTENANCE",
  "OTHER",
]);

// Create: empty/absent id → undefined (treated as unset).
const optionalId = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

// Update: distinguish "absent" (undefined → leave unchanged) from "" (null → clear).
const patchId = z
  .string()
  .optional()
  .transform((v) => (v === undefined ? undefined : v.trim().length > 0 ? v.trim() : null));

// Create: an absent due date means "no due date" (null).
const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? parseFormDateOnly(v) : null));

// Update: distinguish "absent" (undefined → leave unchanged) from "" (null → clear).
const patchDate = z
  .string()
  .optional()
  .transform((v) => (v === undefined ? undefined : v.length > 0 ? parseFormDateOnly(v) : null));

export const createTicketSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  description: z.string().trim().max(10000).optional(),
  projectId: z.string().min(1, "Select a project."),
  status: ticketStatusEnum.default("BACKLOG"),
  priority: ticketPriorityEnum.default("MEDIUM"),
  type: ticketTypeEnum.default("TASK"),
  assigneeId: optionalId,
  dueDate: optionalDate,
  labelIds: z.array(z.string()).optional().default([]),
});

export const updateTicketSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(10000).optional(),
  status: ticketStatusEnum.optional(),
  priority: ticketPriorityEnum.optional(),
  type: ticketTypeEnum.optional(),
  assigneeId: patchId,
  dueDate: patchDate,
});

export const addCommentSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(1, "Comment can't be empty.").max(5000),
});

export const updateCommentSchema = z.object({
  commentId: z.string().min(1),
  body: z.string().trim().min(1, "Comment can't be empty.").max(5000),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
