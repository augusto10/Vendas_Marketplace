import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Nome obrigatorio."),
  email: z.string().email("Email invalido."),
  role: z.string().min(1, "Cargo obrigatorio.")
});

export const updateUserStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["ACTIVE", "DISABLED"])
});

export const createRoleSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9_.-]+$/),
  permissions: z.array(z.string()).default([])
});
