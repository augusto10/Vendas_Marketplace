export const PERMISSIONS = [
  "dashboard.view",
  "uploads.view",
  "uploads.create",
  "uploads.reprocess",
  "uploads.delete",
  "finance.view",
  "finance.export",
  "fiscal.view",
  "fiscal.manage_rules",
  "fiscal.export",
  "fees.view",
  "fees.classify",
  "users.view",
  "users.create",
  "users.update",
  "users.disable",
  "users.delete",
  "system.settings",
  "system.audit_logs",
  "system.api_settings",
  "system.maintenance",
  "api.tokens.view",
  "api.tokens.create",
  "api.tokens.revoke",
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
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

const rolePermissionFallbacks: Record<string, PermissionKey[]> = {
  vendas_atacado: ["atacado.clientes.view", "atacado.clientes.manage", "atacado.produtos.view", "atacado.pedidos.view", "atacado.pedidos.create", "atacado.pedidos.update", "atacado.entregas.view"],
  vendas: ["atacado.clientes.view", "atacado.clientes.manage", "atacado.produtos.view", "atacado.pedidos.view", "atacado.pedidos.create", "atacado.pedidos.update", "atacado.entregas.view"],
  vendedor: ["atacado.clientes.view", "atacado.clientes.manage", "atacado.produtos.view", "atacado.pedidos.view", "atacado.pedidos.create", "atacado.pedidos.update", "atacado.entregas.view"],
  financeiro_atacado: ["atacado.clientes.view", "atacado.produtos.view", "atacado.pedidos.view", "atacado.entregas.view", "atacado.financeiro.view", "atacado.financeiro.update"],
  financeiro: ["atacado.clientes.view", "atacado.produtos.view", "atacado.pedidos.view", "atacado.entregas.view", "atacado.financeiro.view", "atacado.financeiro.update"],
  separacao_atacado: ["atacado.produtos.view", "atacado.pedidos.view", "atacado.separacao.view", "atacado.separacao.update", "atacado.entregas.view", "atacado.entregas.update"],
  separacao: ["atacado.produtos.view", "atacado.pedidos.view", "atacado.separacao.view", "atacado.separacao.update", "atacado.entregas.view", "atacado.entregas.update"],
  motorista_atacado: ["atacado.entregas.view", "atacado.entregas.update"],
  motorista: ["atacado.entregas.view", "atacado.entregas.update"]
};

export function hasPermission(user: { roles: string[]; permissions: string[] } | null, permission: PermissionKey) {
  if (!user) return false;
  if (user.roles.includes("master") || user.roles.includes("admin")) return true;
  return user.permissions.includes(permission) || user.roles.some((role) => rolePermissionFallbacks[role]?.includes(permission));
}
