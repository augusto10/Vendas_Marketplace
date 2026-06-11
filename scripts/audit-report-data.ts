import { existsSync, readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

function loadEnv() {
  if (process.env.DATABASE_URL || !existsSync(".env")) return;
  const env = readFileSync(".env", "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=("?)(.*)\2$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[3];
  }
}

loadEnv();

const prisma = new PrismaClient();

type Row = Record<string, unknown>;

function keyOf(values: unknown[]) {
  return values.map((value) => String(value ?? "").trim().toUpperCase()).join("|");
}

function countGroups<T>(rows: T[], keyFor: (row: T) => string | null) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFor(row);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .sort((left, right) => right[1].length - left[1].length)
    .map(([key, items]) => ({ key, count: items.length, items }));
}

function money(value: unknown) {
  return Number(value ?? 0);
}

function printSection(title: string) {
  console.log(`\n== ${title} ==`);
}

function printGroups(title: string, groups: Array<{ key: string; count: number }>, limit = 10) {
  const extraRows = groups.reduce((sum, group) => sum + group.count - 1, 0);
  console.log(`${title}: ${groups.length} grupos, ${extraRows} registros excedentes provaveis.`);
  for (const group of groups.slice(0, limit)) {
    console.log(`  - ${group.key} (${group.count} registros)`);
  }
}

async function main() {
  printSection("Contagem geral");
  const counts = await Promise.all([
    prisma.upload.count(),
    prisma.order.count(),
    prisma.salesInvoice.count(),
    prisma.shopeeIncome.count(),
    prisma.walletTransaction.count(),
    prisma.acceleraTransaction.count(),
    prisma.adjustment.count(),
    prisma.serviceFeeDetail.count(),
    prisma.atacadoCliente.count(),
    prisma.atacadoProduto.count(),
    prisma.atacadoPedido.count(),
    prisma.atacadoPedidoItem.count()
  ]);
  [
    "uploads",
    "orders",
    "sales_invoices",
    "shopee_income",
    "wallet_transactions",
    "accelera_transactions",
    "adjustments",
    "service_fee_details",
    "atacado_clientes",
    "atacado_produtos",
    "atacado_pedidos",
    "atacado_pedido_itens"
  ].forEach((name, index) => console.log(`${name}: ${counts[index]}`));

  printSection("Duplicidades que afetam relatorios marketplace");
  const [invoices, incomes, wallet, accelera, adjustments, serviceFees] = await Promise.all([
    prisma.salesInvoice.findMany({ select: { id: true, customerOrder: true, documentNumber: true, emissionDate: true, branch: true, totalAmount: true, freightAmount: true } }),
    prisma.shopeeIncome.findMany(),
    prisma.walletTransaction.findMany(),
    prisma.acceleraTransaction.findMany(),
    prisma.adjustment.findMany(),
    prisma.serviceFeeDetail.findMany()
  ]);

  const invoiceGroups = countGroups(invoices, (row) => row.customerOrder ? keyOf([row.customerOrder]) : null);
  printGroups("Pedidos com mais de uma nota fiscal vinculada", invoiceGroups);

  const possibleRepeatedShopee = invoiceGroups.reduce((sum, group) => {
    const orderId = String(group.items[0].customerOrder ?? "");
    const orderIncome = incomes
      .filter((income) => income.orderMarketplaceId === orderId)
      .reduce((incomeSum, income) => incomeSum + money(income.releasedAmount), 0);
    return sum + orderIncome * (group.count - 1);
  }, 0);
  console.log(`Valor Shopee liberado que pode aparecer repetido em relatorio por nota: ${possibleRepeatedShopee.toFixed(2)}`);

  printGroups("Notas fiscais com mesma chave fiscal", countGroups(invoices, (row) => keyOf([row.documentNumber, row.emissionDate?.toISOString(), row.branch])));
  printGroups("Shopee Income duplicado por chave de negocio", countGroups(incomes, (row) => keyOf([
    row.orderMarketplaceId,
    row.sku,
    row.productName,
    row.orderCreatedAt?.toISOString(),
    row.paymentCompletedAt?.toISOString(),
    money(row.releasedAmount).toFixed(2),
    money(row.productPrice).toFixed(2),
    money(row.refundAmount).toFixed(2),
    money(row.logisticsFreight).toFixed(2),
    money(row.commissionFee).toFixed(2),
    money(row.serviceFee).toFixed(2),
    money(row.transactionFee).toFixed(2),
    money(row.affiliateCommissionFee).toFixed(2)
  ])));
  printGroups("Carteira duplicada por chave de negocio", countGroups(wallet, (row) => keyOf([
    row.transactionDate.toISOString(),
    row.transactionType,
    row.description,
    row.orderMarketplaceId,
    row.direction,
    money(row.amount).toFixed(2),
    row.status,
    money(row.balanceAfter).toFixed(2),
    money(row.adjustmentValue).toFixed(2)
  ])));
  printGroups("Acelera duplicado por chave de negocio", countGroups(accelera, (row) => keyOf([
    row.rescueDate?.toISOString(),
    row.rescueId,
    row.orderMarketplaceId,
    money(row.rescuedAmount).toFixed(2),
    money(row.serviceFee).toFixed(2),
    money(row.receivedAmount).toFixed(2),
    row.status,
    row.dueDate?.toISOString()
  ])));
  printGroups("Ajustes duplicados por chave de negocio", countGroups(adjustments, (row) => row.orderMarketplaceId ? keyOf([
    row.orderMarketplaceId,
    row.description,
    row.reason,
    money(row.amount).toFixed(2),
    row.occurredAt?.toISOString()
  ]) : null));
  printGroups("Taxas detalhadas duplicadas por chave de negocio", countGroups(serviceFees, (row) => row.orderMarketplaceId ? keyOf([
    row.orderMarketplaceId,
    row.feeName,
    money(row.amount).toFixed(2),
    row.occurredAt?.toISOString()
  ]) : null));

  printSection("Duplicidades administrativas e atacado");
  const [userRoles, rolePermissions, clientes, produtos, itens, pagamentos, entregas, anexos] = await Promise.all([
    prisma.userRole.findMany(),
    prisma.rolePermission.findMany(),
    prisma.atacadoCliente.findMany(),
    prisma.atacadoProduto.findMany(),
    prisma.atacadoPedidoItem.findMany({ include: { pedido: true, produto: true } }),
    prisma.atacadoPagamento.findMany(),
    prisma.atacadoEntrega.findMany(),
    prisma.atacadoAnexo.findMany()
  ]);

  printGroups("Permissoes repetidas por perfil", countGroups(rolePermissions, (row) => keyOf([row.roleId, row.permissionId])));
  printGroups("Perfis repetidos por usuario", countGroups(userRoles, (row) => keyOf([row.userId, row.roleId])));
  printGroups("Clientes atacado com mesmo documento", countGroups(clientes, (row) => row.documento ? keyOf([row.documento]) : null));
  printGroups("Clientes atacado com mesmo telefone", countGroups(clientes, (row) => row.telefone ? keyOf([row.telefone]) : null));
  printGroups("Produtos atacado por referencia", countGroups(produtos, (row) => row.referencia ? keyOf([row.referencia]) : null));
  printGroups("Produtos atacado por nome/cor/grade/preco", countGroups(produtos, (row) => keyOf([row.nome, row.cor, row.grade, money(row.precoPorCaixa).toFixed(2)])));
  printGroups("Itens repetidos no mesmo pedido atacado", countGroups(itens, (row) => keyOf([
    row.pedidoId,
    row.produtoId,
    row.quantidadeCaixas,
    row.quantidadePares,
    money(row.precoCaixa).toFixed(2),
    money(row.valorTotal).toFixed(2),
    row.observacao
  ])));
  printGroups("Pagamentos atacado com mesma chave", countGroups(pagamentos, (row) => keyOf([
    row.pedidoId,
    row.status,
    money(row.valorPago).toFixed(2),
    row.comprovanteUrl,
    row.observacao
  ])));
  printGroups("Entregas atacado com mesma chave", countGroups(entregas, (row) => keyOf([
    row.pedidoId,
    row.tipo,
    row.status,
    row.motoristaId,
    row.endereco,
    row.reciboUrl,
    row.observacao
  ])));
  printGroups("Anexos atacado repetidos", countGroups(anexos, (row) => keyOf([row.pedidoId, row.tipo, row.url, row.publicId, row.originalName])));

  printSection("Avisos");
  console.log("Grupos listados como 'provaveis' precisam de revisao antes de apagar, pois podem ser eventos legitimos repetidos.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
