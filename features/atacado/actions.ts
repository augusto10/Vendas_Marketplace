"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/atacado/permissions";
import { prisma } from "@/lib/prisma";
import { clienteSchema, entregaSchema, pagamentoSchema, pedidoSchema, produtoSchema, statusPedidoSchema } from "@/lib/atacado/schemas";
import { createCliente, createEntrega, createPedido, createProduto, registerPagamento, updatePedidoStatus, updateProduto } from "@/lib/atacado/service";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function createClienteAction(formData: FormData) {
  const access = await requirePermission("atacado.clientes.manage");
  if (access.error) return;

  const data = clienteSchema.parse({
    nome: formString(formData, "nome"),
    telefone: formString(formData, "telefone"),
    cidade: formString(formData, "cidade"),
    estado: formString(formData, "estado"),
    endereco: formString(formData, "endereco"),
    documento: formString(formData, "documento"),
    observacoes: formString(formData, "observacoes"),
    status: formString(formData, "status") ?? "ATIVO"
  });
  await createCliente(data);
  revalidatePath("/atacado/clientes");
}

export async function createProdutoAction(formData: FormData) {
  const access = await requirePermission("atacado.produtos.manage");
  if (access.error) return;

  const data = produtoSchema.parse({
    referencia: formString(formData, "referencia"),
    nome: formString(formData, "nome"),
    categoria: formString(formData, "categoria"),
    cor: formString(formData, "cor"),
    grade: formString(formData, "grade"),
    quantidadePorCaixa: formString(formData, "quantidadePorCaixa") ?? "12",
    precoPorCaixa: formString(formData, "precoPorCaixa") ?? "0",
    permiteEditarPrecoPedido: formData.get("permiteEditarPrecoPedido") === "on",
    status: formString(formData, "status") ?? "ATIVO",
    observacoes: formString(formData, "observacoes")
  });
  await createProduto(data);
  revalidatePath("/atacado/produtos");
}

export async function updateProdutoAction(formData: FormData) {
  const access = await requirePermission("atacado.produtos.manage");
  if (access.error) return;

  const produtoId = formString(formData, "produtoId");
  if (!produtoId) return;

  const data = produtoSchema.parse({
    referencia: formString(formData, "referencia"),
    nome: formString(formData, "nome"),
    categoria: formString(formData, "categoria"),
    cor: formString(formData, "cor"),
    grade: formString(formData, "grade"),
    quantidadePorCaixa: formString(formData, "quantidadePorCaixa") ?? "12",
    precoPorCaixa: formString(formData, "precoPorCaixa") ?? "0",
    permiteEditarPrecoPedido: formData.get("permiteEditarPrecoPedido") === "on",
    status: formString(formData, "status") ?? "ATIVO",
    observacoes: formString(formData, "observacoes")
  });
  await updateProduto(produtoId, data);
  revalidatePath("/atacado/produtos");
  revalidatePath("/atacado/pedidos");
}

export async function createPedidoAction(formData: FormData) {
  const access = await requirePermission("atacado.pedidos.create");
  if (access.error || !access.user) return;

  const data = pedidoSchema.parse({
    clienteId: formString(formData, "clienteId"),
    produtoId: formString(formData, "produtoId"),
    observacao: formString(formData, "observacao"),
    itens: [
      {
        produtoId: formString(formData, "produtoId"),
        quantidadeCaixas: formString(formData, "quantidadeCaixas") ?? "1",
        precoCaixa: formString(formData, "precoCaixa"),
        descontoPercentual: formString(formData, "descontoPercentual") ?? "0"
      }
    ]
  });
  const priceOverrideAuthorized = await verifyAdminPriceOverride(
    formString(formData, "adminEmail"),
    formString(formData, "adminPassword")
  );
  await createPedido(data, access.user.id, { priceOverrideAuthorized });
  revalidatePath("/atacado");
  revalidatePath("/atacado/pedidos");
}

export async function updatePedidoStatusAction(formData: FormData) {
  const access = await requirePermission("atacado.pedidos.update");
  if (access.error || !access.user) return;

  const pedidoId = formString(formData, "pedidoId");
  if (!pedidoId) return;
  const data = statusPedidoSchema.parse({
    status: formString(formData, "status"),
    observacao: formString(formData, "observacao")
  });
  await updatePedidoStatus(pedidoId, data, access.user.id, { isMaster: access.user.roles.includes("master") });
  revalidatePath("/atacado");
  revalidatePath("/atacado/pedidos");
  revalidatePath("/atacado/separacao");
  revalidatePath("/atacado/financeiro");
  revalidatePath("/atacado/entregas");
}

export async function registerPagamentoAction(formData: FormData) {
  const access = await requirePermission("atacado.financeiro.update");
  if (access.error || !access.user) return;

  const pedidoId = formString(formData, "pedidoId");
  if (!pedidoId) return;
  const data = pagamentoSchema.parse({
    status: formString(formData, "status") ?? "PENDENTE",
    valorPago: formString(formData, "valorPago") ?? "0",
    observacao: formString(formData, "observacao")
  });
  const file = formData.get("file");
  await registerPagamento(pedidoId, data, access.user.id, file instanceof File && file.size ? file : undefined);
  revalidatePath("/atacado");
  revalidatePath("/atacado/financeiro");
  revalidatePath("/atacado/pedidos");
}

export async function createEntregaAction(formData: FormData) {
  const access = await requirePermission("atacado.entregas.update");
  if (access.error || !access.user) return;

  const pedidoId = formString(formData, "pedidoId");
  if (!pedidoId) return;
  const data = entregaSchema.parse({
    motoristaId: formString(formData, "motoristaId"),
    tipo: formString(formData, "tipo") ?? "ENTREGA_PROPRIA",
    endereco: formString(formData, "endereco"),
    observacao: formString(formData, "observacao")
  });
  await createEntrega(pedidoId, data, access.user.id);
  await updatePedidoStatus(pedidoId, { status: "EM_EXPEDICAO", observacao: "Entrega criada" }, access.user.id, { isMaster: access.user.roles.includes("master") });
  revalidatePath("/atacado");
  revalidatePath("/atacado/entregas");
}

async function verifyAdminPriceOverride(email?: string, password?: string) {
  if (!email || !password) return false;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } }
          }
        }
      }
    }
  });
  if (!user || user.status !== "ACTIVE" || !user.passwordHash) return false;

  const hasAdminAccess = user.roles.some((entry) => (
    ["master", "admin", "admin_atacado"].includes(entry.role.slug) ||
    entry.role.permissions.some((permission) => permission.permission.key === "atacado.produtos.manage")
  ));
  if (!hasAdminAccess) return false;

  return bcrypt.compare(password, user.passwordHash);
}
