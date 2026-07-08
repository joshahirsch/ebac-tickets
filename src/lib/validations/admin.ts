import { z } from "zod";

export const roleEnum = z.enum(["ADMIN", "MANAGER", "MEMBER", "VIEWER"]);
export const projectStatusEnum = z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  name: z.string().trim().max(120).optional(),
  role: roleEnum.default("MEMBER"),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: roleEnum,
});

export const setUserActiveSchema = z.object({
  userId: z.string().min(1),
  isActive: z.boolean(),
});

export const setPasswordSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
});

export const createProjectSchema = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, "Key must be 2–8 letters.")
    .max(8, "Key must be 2–8 letters.")
    .regex(/^[A-Z0-9]+$/, "Key: letters and numbers only."),
  name: z.string().trim().min(2, "Name is required.").max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(120).optional(),
  ownerId: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export const updateProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(120).optional(),
  status: projectStatusEnum.optional(),
  ownerId: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v.length > 0 ? v : null)),
});

export const labelSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(40),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #2563eb")
    .default("#64748b"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type LabelInput = z.infer<typeof labelSchema>;
