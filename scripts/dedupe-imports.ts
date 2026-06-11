import { createHash } from "crypto";
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
const apply = process.argv.includes("--apply");

type ImportModel =
  | "walletTransaction"
  | "acceleraTransaction"
  | "shopeeIncome"
  | "serviceFeeDetail"
  | "adjustment";

type DedupeRow = {
  id: string;
  createdAt: Date;
  [key: string]: unknown;
};

type ImportRow = DedupeRow & {
  rawHash: string;
};

type ImportDelegate = {
  deleteMany(args: { where: { id: { in: string[] } } }): Promise<unknown>;
  update(args: { where: { id: string }; data: { rawHash: string } }): Promise<unknown>;
};

function importDelegate(client: Pick<PrismaClient, ImportModel>, model: ImportModel) {
  return client[model] as unknown as ImportDelegate;
}

function canonicalDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : null;
}

function canonicalText(value: unknown) {
  return String(value ?? "").trim();
}

function money(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function hashRow(row: unknown) {
  return createHash("sha256").update(JSON.stringify(row)).digest("hex");
}

function canonicalHash(scope: string, value: Record<string, unknown>) {
  const ordered = Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = value[key];
      return acc;
    }, {});
  return hashRow({ scope, ...ordered });
}

function byOldest<T extends DedupeRow>(left: T, right: T) {
  return left.createdAt.getTime() - right.createdAt.getTime();
}

function groupRows<T extends DedupeRow>(rows: T[], keyFor: (row: T) => string | null) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFor(row);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, items: items.sort(byOldest) }));
}

async function cleanModel(model: ImportModel, groups: Array<{ key: string; items: ImportRow[] }>) {
  const duplicateIds = groups.flatMap((group) => group.items.slice(1).map((item) => item.id));
  console.log(`${model}: ${groups.length} grupos duplicados, ${duplicateIds.length} registros excedentes.`);

  if (!apply || duplicateIds.length === 0) return duplicateIds.length;

  await prisma.$transaction(async (tx) => {
    const delegate = importDelegate(tx as unknown as Pick<PrismaClient, ImportModel>, model);
    await delegate.deleteMany({
      where: { id: { in: duplicateIds } }
    });

    for (const group of groups) {
      const keep = group.items[0];
      if (keep.rawHash === group.key) continue;
      await delegate.update({
        where: { id: keep.id },
        data: { rawHash: group.key }
      });
    }
  }, { maxWait: 20000, timeout: 120000 });

  return duplicateIds.length;
}

async function cleanSalesInvoices() {
  const rows = await prisma.salesInvoice.findMany({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  const groups = groupRows(rows, (row) => canonicalText(row.documentNumber).toUpperCase());
  const duplicateIds = groups.flatMap((group) => group.items.slice(1).map((item) => item.id));
  console.log(`salesInvoice: ${groups.length} grupos duplicados por numeracao, ${duplicateIds.length} registros excedentes.`);

  if (!apply || duplicateIds.length === 0) return duplicateIds.length;

  await prisma.salesInvoice.deleteMany({ where: { id: { in: duplicateIds } } });
  return duplicateIds.length;
}

async function main() {
  console.log(apply ? "Modo limpeza: apagando duplicados." : "Modo diagnostico: nada sera apagado. Use --apply para limpar.");

  const walletRows = await prisma.walletTransaction.findMany();
  const acceleraRows = await prisma.acceleraTransaction.findMany();
  const incomeRows = await prisma.shopeeIncome.findMany();
  const serviceFeeRows = await prisma.serviceFeeDetail.findMany();
  const adjustmentRows = await prisma.adjustment.findMany();

  const deleted = [];
  deleted.push(await cleanSalesInvoices());
  deleted.push(await cleanModel("walletTransaction", groupRows(walletRows, (row) => canonicalHash("wallet", {
      transactionDate: canonicalDate(row.transactionDate),
      transactionType: row.transactionType,
      description: row.description,
      orderMarketplaceId: row.orderMarketplaceId,
      direction: row.direction,
      amount: money(row.amount),
      status: row.status,
      balanceAfter: money(row.balanceAfter),
      adjustmentValue: money(row.adjustmentValue)
    }))));
  deleted.push(await cleanModel("acceleraTransaction", groupRows(acceleraRows, (row) => canonicalHash("accelera", {
      rescueDate: canonicalDate(row.rescueDate),
      rescueId: canonicalText(row.rescueId),
      orderMarketplaceId: canonicalText(row.orderMarketplaceId),
      availableAmount: money(row.availableAmount),
      rescuePercent: money(row.rescuePercent),
      rescuedAmount: money(row.rescuedAmount),
      serviceFee: money(row.serviceFee),
      receivedAmount: money(row.receivedAmount),
      remainingAmount: money(row.remainingAmount),
      refundedAmount: money(row.refundedAmount),
      orderGrossAmount: money(row.orderGrossAmount),
      pendingAmount: money(row.pendingAmount),
      status: canonicalText(row.status),
      lastTransactionAt: canonicalDate(row.lastTransactionAt),
      dueDate: canonicalDate(row.dueDate)
    }))));
  deleted.push(await cleanModel("shopeeIncome", groupRows(incomeRows, (row) => canonicalHash("shopee-income", {
      orderMarketplaceId: row.orderMarketplaceId,
      sku: canonicalText(row.sku),
      productName: canonicalText(row.productName),
      orderCreatedAt: canonicalDate(row.orderCreatedAt),
      paymentCompletedAt: canonicalDate(row.paymentCompletedAt),
      releasedAmount: money(row.releasedAmount),
      productPrice: money(row.productPrice),
      refundAmount: money(row.refundAmount),
      logisticsFreight: money(row.logisticsFreight),
      buyerShippingFee: money(row.buyerShippingFee),
      shopeeShippingDiscount: money(row.shopeeShippingDiscount),
      reverseShippingFee: money(row.reverseShippingFee),
      sellerReturnFee: money(row.sellerReturnFee),
      commissionFee: money(row.commissionFee),
      serviceFee: money(row.serviceFee),
      transactionFee: money(row.transactionFee),
      affiliateCommissionFee: money(row.affiliateCommissionFee),
      buyerPaidAmount: money(row.buyerPaidAmount),
      carrier: row.carrier ?? "",
      buyerRefundedAmount: money(row.buyerRefundedAmount)
    }))));
  deleted.push(await cleanModel("serviceFeeDetail", groupRows(serviceFeeRows, (row) => {
      if (!canonicalText(row.orderMarketplaceId)) return null;
      return canonicalHash("service-fee", {
        orderMarketplaceId: canonicalText(row.orderMarketplaceId),
        feeName: row.feeName,
        amount: money(row.amount),
        occurredAt: canonicalDate(row.occurredAt)
      });
    })));
  deleted.push(await cleanModel("adjustment", groupRows(adjustmentRows, (row) => {
      if (!canonicalText(row.orderMarketplaceId)) return null;
      return canonicalHash("income-adjustment", {
        orderMarketplaceId: row.orderMarketplaceId,
        amount: money(row.amount),
        occurredAt: canonicalDate(row.occurredAt),
        description: canonicalText(row.description),
        reason: canonicalText(row.reason)
      });
    })));

  console.log(`Total de registros excedentes ${apply ? "apagados" : "encontrados"}: ${deleted.reduce((sum, count) => sum + count, 0)}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
