import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const permissions = [
  "dashboard.view",
  "uploads.view",
  "uploads.create",
  "uploads.reprocess",
  "uploads.delete",
  "sales.view",
  "sales.export",
  "finance.view",
  "finance.export",
  "fiscal.view",
  "fiscal.manage_rules",
  "fiscal.export",
  "fees.view",
  "fees.classify",
  "fees.export",
  "reports.view",
  "reports.export",
  "users.view",
  "users.create",
  "users.update",
  "users.disable",
  "users.delete",
  "roles.view",
  "roles.create",
  "roles.update",
  "roles.delete",
  "system.settings",
  "system.audit_logs",
  "system.api_settings",
  "system.maintenance",
  "api.tokens.view",
  "api.tokens.create",
  "api.tokens.revoke",
  "api.logs.view"
];

const rolePermissions: Record<string, string[]> = {
  master: permissions,
  admin: permissions.filter((key) => ![
    "system.settings",
    "system.api_settings",
    "system.maintenance",
    "users.delete"
  ].includes(key)),
  financeiro: ["dashboard.view", "finance.view", "finance.export", "fees.view"],
  fiscal: ["dashboard.view", "fiscal.view", "fiscal.export"],
  operador: ["uploads.view", "uploads.create"],
  visualizador: ["dashboard.view", "finance.view", "fiscal.view", "fees.view", "reports.view"]
};

async function main() {
  for (const key of permissions) {
    const [module, action] = key.split(".");
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, module, action, description: key }
    });
  }

  for (const [slug, keys] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: slug === "master" ? "Administrador Master" : slug[0].toUpperCase() + slug.slice(1),
        isSystem: true
      }
    });

    const rolePermissionIds = await prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { id: true }
    });

    for (const permission of rolePermissionIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id }
      });
    }
  }

  const masterRole = await prisma.role.findUniqueOrThrow({ where: { slug: "master" } });
  const passwordHash = await bcrypt.hash("Admin@12345", 12);
  const master = await prisma.user.upsert({
    where: { email: "master@empresa.com" },
    update: {},
    create: {
      name: "Administrador Master",
      email: "master@empresa.com",
      passwordHash
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: master.id, roleId: masterRole.id } },
    update: {},
    create: { userId: master.id, roleId: masterRole.id }
  });

  const taxRules = [
    ["SP", 18, 12, 0],
    ["RJ", 20, 12, 2],
    ["MG", 18, 12, 0],
    ["PR", 19.5, 12, 0],
    ["RS", 17, 12, 0],
    ["SC", 17, 12, 0],
    ["BA", 20.5, 12, 0],
    ["PE", 20.5, 12, 0]
  ] as const;

  for (const [uf, internalRate, interstateRate, fcpRate] of taxRules) {
    await prisma.stateTaxRule.upsert({
      where: { uf_validFrom: { uf, validFrom: new Date("2026-01-01T00:00:00.000Z") } },
      update: {},
      create: {
        uf,
        internalRate,
        interstateRate,
        fcpRate,
        validFrom: new Date("2026-01-01T00:00:00.000Z")
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
