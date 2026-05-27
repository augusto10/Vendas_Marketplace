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

export const updateUserSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(2, "Nome obrigatorio."),
  email: z.string().email("Email invalido."),
  role: z.string().min(1, "Cargo obrigatorio."),
  status: z.enum(["ACTIVE", "DISABLED"]),
  password: z.string().optional()
}).superRefine((value, context) => {
  if (value.password && value.password.length < 8) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A nova senha deve ter pelo menos 8 caracteres.",
      path: ["password"]
    });
  }
});

export const createRoleSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9_.-]+$/),
  permissions: z.array(z.string()).default([])
});
