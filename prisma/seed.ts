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
  "api.logs.view",
  "atacado.dashboard.view",
  "atacado.clientes.view",
  "atacado.clientes.manage",
  "atacado.produtos.view",
  "atacado.produtos.manage",
  "atacado.pedidos.view",
  "atacado.pedidos.create",
  "atacado.pedidos.update",
  "atacado.separacao.view",
  "atacado.separacao.update",
  "atacado.financeiro.view",
  "atacado.financeiro.update",
  "atacado.entregas.view",
  "atacado.entregas.update"
];

const rolePermissions: Record<string, string[]> = {
  master: permissions,
  admin: permissions,
  financeiro: ["dashboard.view", "finance.view", "finance.export", "fees.view"],
  fiscal: ["dashboard.view", "fiscal.view", "fiscal.export"],
  operador: ["uploads.view", "uploads.create"],
  visualizador: ["dashboard.view", "finance.view", "fiscal.view", "fees.view", "reports.view"],
  admin_atacado: permissions.filter((key) => key.startsWith("atacado.")),
  vendas_atacado: [
    "atacado.clientes.view",
    "atacado.clientes.manage",
    "atacado.produtos.view",
    "atacado.pedidos.view",
    "atacado.pedidos.create"
  ],
  separacao_atacado: [
    "atacado.pedidos.view",
    "atacado.separacao.view",
    "atacado.separacao.update",
    "atacado.entregas.view",
    "atacado.entregas.update"
  ],
  financeiro_atacado: [
    "atacado.clientes.view",
    "atacado.produtos.view",
    "atacado.pedidos.view",
    "atacado.entregas.view",
    "atacado.financeiro.view",
    "atacado.financeiro.update"
  ],
  motorista_atacado: [
    "atacado.entregas.view",
    "atacado.entregas.update"
  ]
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

    await prisma.rolePermission.deleteMany({
      where: {
        roleId: role.id,
        permissionId: { notIn: rolePermissionIds.map((permission) => permission.id) }
      }
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

  const testUsers = [
    { name: "Admin Atacado", email: "admin.atacado@empresa.com", role: "admin_atacado" },
    { name: "Vendedor Atacado", email: "vendas.atacado@empresa.com", role: "vendas_atacado" },
    { name: "Separacao Atacado", email: "separacao.atacado@empresa.com", role: "separacao_atacado" },
    { name: "Financeiro Atacado", email: "financeiro.atacado@empresa.com", role: "financeiro_atacado" },
    { name: "Motorista Atacado", email: "motorista.atacado@empresa.com", role: "motorista_atacado" }
  ];

  for (const testUser of testUsers) {
    const role = await prisma.role.findUniqueOrThrow({ where: { slug: testUser.role } });
    const user = await prisma.user.upsert({
      where: { email: testUser.email },
      update: { name: testUser.name, passwordHash, status: "ACTIVE" },
      create: {
        name: testUser.name,
        email: testUser.email,
        passwordHash,
        status: "ACTIVE"
      }
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id }
    });
  }

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
