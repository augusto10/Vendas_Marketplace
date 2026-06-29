import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireAnyPermission } from "@/lib/atacado/permissions";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const manageRoles = ["master", "admin", "admin_atacado"];

const userSchemaBase = z.object({
  name: z.string().min(2, "Nome obrigatorio."),
  email: z.string().email("Email invalido."),
  role: z.string().min(1, "Cargo obrigatorio."),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  password: z.string().optional()
});

const userSchema = userSchemaBase.superRefine((value, context) => {
  if (value.password && value.password.length < 8) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A senha deve ter pelo menos 8 caracteres.",
      path: ["password"]
    });
  }
});

const updateUserSchema = userSchemaBase.extend({
  id: z.string().uuid()
}).superRefine((value, context) => {
  if (value.password && value.password.length < 8) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A senha deve ter pelo menos 8 caracteres.",
      path: ["password"]
    });
  }
});

const deleteUserSchema = z.object({
  id: z.string().uuid()
});

async function requireUsersManager(request: Request) {
  const access = await requireAnyPermission(["users.view", "atacado.dashboard.view"], request);
  if (access.error) return access;

  const canManage = access.user.roles.some((role) => manageRoles.includes(role));
  if (!canManage) {
    return {
      error: Response.json({ ok: false, error: { code: "FORBIDDEN", message: "Permissao insuficiente." } }, { status: 403 }),
      user: null
    };
  }

  return access;
}

function formatUser(user: Awaited<ReturnType<typeof prisma.user.findMany>>[number] & {
  roles: Array<{
    role: {
      slug: string;
      permissions?: Array<{ permission: { key: string } }>;
    };
  }>;
}) {
  const roles = user.roles.map((entry) => entry.role.slug);
  const permissions = Array.from(new Set(user.roles.flatMap((entry) => entry.role.permissions?.map((item) => item.permission.key) ?? [])));

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    imageUrl: user.imageUrl,
    status: user.status,
    roles,
    permissions,
    createdAt: user.createdAt.toLocaleDateString("pt-BR"),
    lastLoginAt: user.lastLoginAt?.toLocaleString("pt-BR") ?? "-"
  };
}

export async function GET(request: Request) {
  try {
    const access = await requireUsersManager(request);
    if (access.error) return access.error;

    const [users, roles] = await Promise.all([
      prisma.user.findMany({
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.role.findMany({ orderBy: { name: "asc" } })
    ]);
    const canManageMaster = access.user.roles.includes("master");
    const availableRoles = roles
      .filter((role) => canManageMaster || role.slug !== "master")
      .map((role) => ({ name: role.name, slug: role.slug }));

    return ok({
      usuarios: users.map(formatUser),
      roles: availableRoles,
      canManageMaster
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireUsersManager(request);
    if (access.error) return access.error;

    const body = userSchema.parse(await request.json());
    const role = await prisma.role.findUnique({ where: { slug: body.role } });
    if (!role) {
      return Response.json({ ok: false, error: { code: "ROLE_NOT_FOUND", message: "Cargo nao encontrado." } }, { status: 404 });
    }
    if (role.slug === "master" && !access.user.roles.includes("master")) {
      return Response.json({ ok: false, error: { code: "FORBIDDEN", message: "Somente Master pode atribuir cargo Master." } }, { status: 403 });
    }

    const user = await prisma.user.upsert({
      where: { email: body.email },
      update: {
        name: body.name,
        status: body.status ?? "ACTIVE",
        ...(body.password ? { passwordHash: await bcrypt.hash(body.password, 12) } : {})
      },
      create: {
        name: body.name,
        email: body.email,
        status: body.status ?? "ACTIVE",
        passwordHash: await bcrypt.hash(body.password || "Temp@12345", 12)
      }
    });

    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

    const saved = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return ok({ usuario: formatUser(saved), temporaryPassword: body.password ? null : "Temp@12345" }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await requireUsersManager(request);
    if (access.error) return access.error;

    const body = updateUserSchema.parse(await request.json());
    const [target, role] = await Promise.all([
      prisma.user.findUnique({
        where: { id: body.id },
        include: { roles: { include: { role: true } } }
      }),
      prisma.role.findUnique({ where: { slug: body.role } })
    ]);

    if (!target) {
      return Response.json({ ok: false, error: { code: "USER_NOT_FOUND", message: "Usuario nao encontrado." } }, { status: 404 });
    }
    if (!role) {
      return Response.json({ ok: false, error: { code: "ROLE_NOT_FOUND", message: "Cargo nao encontrado." } }, { status: 404 });
    }

    const sessionIsMaster = access.user.roles.includes("master");
    const targetIsMaster = target.roles.some((entry) => entry.role.slug === "master");
    if ((targetIsMaster || role.slug === "master") && !sessionIsMaster) {
      return Response.json({ ok: false, error: { code: "FORBIDDEN", message: "Somente Master pode editar ou atribuir cargo Master." } }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: body.id },
      data: {
        name: body.name,
        email: body.email,
        status: body.status ?? "ACTIVE",
        ...(body.password ? { passwordHash: await bcrypt.hash(body.password, 12) } : {})
      }
    });
    await prisma.userRole.deleteMany({ where: { userId: body.id } });
    await prisma.userRole.create({ data: { userId: body.id, roleId: role.id } });

    const saved = await prisma.user.findUniqueOrThrow({
      where: { id: body.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return ok({ usuario: formatUser(saved) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await requireUsersManager(request);
    if (access.error) return access.error;

    const body = deleteUserSchema.parse(await request.json());
    if (body.id === access.user.id) {
      return fail("FORBIDDEN", "Nao e possivel excluir o proprio usuario.", 403);
    }

    const target = await prisma.user.findUnique({
      where: { id: body.id },
      include: { roles: { include: { role: true } } }
    });

    if (!target) {
      return fail("USER_NOT_FOUND", "Usuario nao encontrado.", 404);
    }

    const sessionIsMaster = access.user.roles.includes("master");
    const targetIsMaster = target.roles.some((entry) => entry.role.slug === "master");
    if (targetIsMaster && !sessionIsMaster) {
      return fail("FORBIDDEN", "Somente Master pode excluir usuario Master.", 403);
    }

    await prisma.$transaction([
      prisma.userRole.deleteMany({ where: { userId: body.id } }),
      prisma.auditLog.updateMany({ where: { actorId: body.id }, data: { actorId: null } }),
      prisma.upload.updateMany({ where: { uploadedById: body.id }, data: { uploadedById: null } }),
      prisma.apiToken.updateMany({ where: { createdById: body.id }, data: { createdById: null } }),
      prisma.atacadoPedido.updateMany({ where: { vendedorId: body.id }, data: { vendedorId: null } }),
      prisma.atacadoAnexo.updateMany({ where: { uploadedById: body.id }, data: { uploadedById: null } }),
      prisma.atacadoPagamento.updateMany({ where: { registradoPorId: body.id }, data: { registradoPorId: null } }),
      prisma.atacadoEntrega.updateMany({ where: { motoristaId: body.id }, data: { motoristaId: null } }),
      prisma.atacadoEntrega.updateMany({ where: { registradoPorId: body.id }, data: { registradoPorId: null } }),
      prisma.atacadoHistoricoStatus.updateMany({ where: { usuarioId: body.id }, data: { usuarioId: null } }),
      prisma.atacadoCarteiraMovimento.updateMany({ where: { criadoPorUsuarioId: body.id }, data: { criadoPorUsuarioId: null } }),
      prisma.user.delete({ where: { id: body.id } })
    ]);

    return ok({ usuario: formatUser(target), deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
