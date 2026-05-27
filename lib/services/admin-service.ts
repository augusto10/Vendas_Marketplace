"use server";

import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/services/audit-service";
import { createRoleSchema, createUserSchema, updateUserSchema, updateUserStatusSchema } from "@/lib/validations/admin-dto";

function assertCanManageUsers(session: Session | null) {
  if (!session?.user || !hasPermission(session.user, "users.create")) {
    throw new Error("Permissao insuficiente.");
  }
}

export async function createUserAction(_: unknown, formData: FormData) {
  const session = await auth();
  assertCanManageUsers(session);
  const parsed = createUserSchema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role")
  });

  const role = await prisma.role.findUnique({ where: { slug: parsed.role } });
  if (!role) throw new Error("Cargo nao encontrado.");
  if (role.slug === "master" && !session?.user.roles.includes("master")) {
    throw new Error("Somente Administrador Master pode criar outro Administrador Master.");
  }

  const user = await prisma.user.upsert({
    where: { email: parsed.email },
    update: { name: parsed.name, status: "ACTIVE" },
    create: {
      name: parsed.name,
      email: parsed.email,
      passwordHash: await bcrypt.hash("Temp@12345", 12)
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id }
  });

  await auditLog({
    actorId: session?.user.id,
    action: "users.create",
    entity: "User",
    entityId: user.id,
    metadata: { email: parsed.email, role: parsed.role }
  });
  revalidatePath("/admin/usuarios");
  return { ok: true, message: "Usuario criado. Senha temporaria: Temp@12345" };
}

export async function updateUserStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, "users.disable")) throw new Error("Permissao insuficiente.");
  const parsed = updateUserStatusSchema.parse({
    userId: formData.get("userId"),
    status: formData.get("status")
  });

  const target = await prisma.user.findUnique({ where: { id: parsed.userId }, include: { roles: { include: { role: true } } } });
  if (target?.roles.some((entry) => entry.role.slug === "master") && !session.user.roles.includes("master")) {
    throw new Error("Administrador comum nao pode alterar Master.");
  }

  await prisma.user.update({ where: { id: parsed.userId }, data: { status: parsed.status } });
  await auditLog({
    actorId: session.user.id,
    action: parsed.status === "ACTIVE" ? "users.activate" : "users.disable",
    entity: "User",
    entityId: parsed.userId
  });
  revalidatePath("/admin/usuarios");
}

export async function updateUserAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, "users.update")) throw new Error("Permissao insuficiente.");
  const parsed = updateUserSchema.parse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    status: formData.get("status"),
    password: formData.get("password") || undefined
  });

  const [target, role] = await Promise.all([
    prisma.user.findUnique({
      where: { id: parsed.userId },
      include: { roles: { include: { role: true } } }
    }),
    prisma.role.findUnique({ where: { slug: parsed.role } })
  ]);
  if (!target) throw new Error("Usuario nao encontrado.");
  if (!role) throw new Error("Cargo nao encontrado.");

  const currentIsMaster = target.roles.some((entry) => entry.role.slug === "master");
  const sessionIsMaster = session.user.roles.includes("master");
  if (currentIsMaster && !sessionIsMaster) {
    throw new Error("Administrador comum nao pode editar Master.");
  }
  if (role.slug === "master" && !sessionIsMaster) {
    throw new Error("Somente Administrador Master pode atribuir cargo Master.");
  }

  await prisma.user.update({
    where: { id: parsed.userId },
    data: {
      name: parsed.name,
      email: parsed.email,
      status: parsed.status,
      ...(parsed.password ? { passwordHash: await bcrypt.hash(parsed.password, 12) } : {})
    }
  });
  await prisma.userRole.deleteMany({ where: { userId: parsed.userId } });
  await prisma.userRole.create({
    data: { userId: parsed.userId, roleId: role.id }
  });

  await auditLog({
    actorId: session.user.id,
    action: "users.update",
    entity: "User",
    entityId: parsed.userId,
    metadata: { email: parsed.email, role: parsed.role, passwordUpdated: Boolean(parsed.password) }
  });
  revalidatePath("/admin/usuarios");
}

export async function createRoleAction(formData: FormData) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user, "system.settings")) throw new Error("Permissao insuficiente.");
  const parsed = createRoleSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    permissions: formData.getAll("permissions")
  });

  const role = await prisma.role.create({ data: { name: parsed.name, slug: parsed.slug } });
  const permissions = await prisma.permission.findMany({ where: { key: { in: parsed.permissions } } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })),
    skipDuplicates: true
  });
  await auditLog({
    actorId: session.user.id,
    action: "roles.create",
    entity: "Role",
    entityId: role.id,
    metadata: { slug: parsed.slug, permissions: parsed.permissions }
  });
  revalidatePath("/admin/permissoes");
}
