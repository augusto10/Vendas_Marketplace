import { prisma } from "@/lib/prisma";
import type { Period } from "@/lib/period";

export type DashboardMetrics = {
  soldAmount: number;
  receivedAmount: number;
  unitsSold: number;
  orders: number;
  averageTicket: number;
  commission: number;
  freight: number;
  icms: number;
  difal: number;
  refunds: number;
  fees: number;
  withdrawals: number;
  ads: number;
  netBalance: number;
};

export async function getDashboardMetrics(period?: Period): Promise<DashboardMetrics> {
  const invoiceWhere = period ? { emissionDate: { gte: period.start, lte: period.end } } : {};
  const incomeWhere = {
    sku: { not: "-" },
    ...(period ? { OR: [{ orderCreatedAt: { gte: period.start, lte: period.end } }, { paymentCompletedAt: { gte: period.start, lte: period.end } }] } : {})
  };
  const walletWhere = period ? { transactionDate: { gte: period.start, lte: period.end } } : {};
  const acceleraWhere = period ? { rescueDate: { gte: period.start, lte: period.end } } : {};

  const [invoiceAgg, incomeAgg, walletAgg, acceleraAgg, fiscalOrderRows] = await Promise.all([
    prisma.salesInvoice.aggregate({
      where: invoiceWhere,
      _sum: { totalAmount: true, quantity: true, freightAmount: true, icmsAmount: true, estimatedDifal: true }
    }),
    prisma.shopeeIncome.aggregate({
      where: incomeWhere,
      _sum: {
        commissionFee: true,
        serviceFee: true,
        transactionFee: true,
        affiliateCommissionFee: true,
        refundAmount: true,
        releasedAmount: true,
        logisticsFreight: true,
        reverseShippingFee: true
      }
    }),
    prisma.walletTransaction.groupBy({
      where: walletWhere,
      by: ["direction", "transactionType"],
      _sum: { amount: true }
    }),
    prisma.acceleraTransaction.aggregate({
      where: acceleraWhere,
      _sum: { receivedAmount: true, serviceFee: true, refundedAmount: true }
    }),
    prisma.salesInvoice.findMany({
      where: invoiceWhere,
      select: { customerOrder: true, documentNumber: true }
    })
  ]);

  const soldAmount = Number(invoiceAgg._sum.totalAmount ?? 0);
  const unitsSold = Number(invoiceAgg._sum.quantity ?? 0);
  const commission = Math.abs(Number(incomeAgg._sum.commissionFee ?? 0));
  const incomeFeesRaw =
    Number(incomeAgg._sum.serviceFee ?? 0) +
    Number(incomeAgg._sum.transactionFee ?? 0) +
    Number(incomeAgg._sum.affiliateCommissionFee ?? 0);
  const incomeFees = Math.abs(incomeFeesRaw);
  const fiscalOrders = new Set(
    fiscalOrderRows.map((row) => row.customerOrder || row.documentNumber).filter(Boolean)
  ).size;
  const freightPaid =
    Number(invoiceAgg._sum.freightAmount ?? 0) +
    Math.abs(Number(incomeAgg._sum.logisticsFreight ?? 0)) +
    Math.abs(Number(incomeAgg._sum.reverseShippingFee ?? 0));
  const walletIn = walletAgg.filter((entry) => entry.direction === "IN").reduce((sum, entry) => sum + Number(entry._sum.amount ?? 0), 0);
  const walletOutRaw = walletAgg.filter((entry) => entry.direction === "OUT").reduce((sum, entry) => sum + Number(entry._sum.amount ?? 0), 0);
  const withdrawals = walletAgg
    .filter((entry) => entry.direction === "OUT" && entry.transactionType.toUpperCase().includes("SAQUES"))
    .reduce((sum, entry) => sum + Math.abs(Number(entry._sum.amount ?? 0)), 0);
  const ads = walletAgg
    .filter((entry) => entry.direction === "OUT" && entry.transactionType.toUpperCase().includes("PAGAMENTO"))
    .reduce((sum, entry) => sum + Math.abs(Number(entry._sum.amount ?? 0)), 0);
  const walletRefundAdjustments = walletAgg
    .filter((entry) => entry.direction === "OUT" && entry.transactionType.toUpperCase().includes("AJUSTE"))
    .reduce((sum, entry) => sum + Math.abs(Number(entry._sum.amount ?? 0)), 0);

  return {
    soldAmount,
    receivedAmount: Number(incomeAgg._sum.releasedAmount ?? 0) + Number(acceleraAgg._sum.receivedAmount ?? 0),
    unitsSold,
    orders: fiscalOrders,
    averageTicket: fiscalOrders ? soldAmount / fiscalOrders : 0,
    commission,
    freight: freightPaid,
    icms: Number(invoiceAgg._sum.icmsAmount ?? 0),
    difal: Number(invoiceAgg._sum.estimatedDifal ?? 0),
    refunds:
      Math.abs(Number(incomeAgg._sum.refundAmount ?? 0)) +
      Math.abs(Number(acceleraAgg._sum.refundedAmount ?? 0)) +
      walletRefundAdjustments,
    fees: incomeFees + Math.abs(Number(acceleraAgg._sum.serviceFee ?? 0)),
    withdrawals,
    ads,
    netBalance: walletIn + walletOutRaw
  };
}

export async function getMonthlySales(period?: Period) {
  const invoices = await prisma.salesInvoice.findMany({
    where: period ? { emissionDate: { gte: period.start, lte: period.end } } : {},
    select: { emissionDate: true, totalAmount: true, quantity: true, freightAmount: true },
    orderBy: { emissionDate: "asc" },
    take: 5000
  });

  const grouped = new Map<string, { month: string; vendas: number; unidades: number; frete: number }>();
  for (const invoice of invoices) {
    const month = invoice.emissionDate.toISOString().slice(0, 7);
    const current = grouped.get(month) ?? { month, vendas: 0, unidades: 0, frete: 0 };
    current.vendas += Number(invoice.totalAmount);
    current.unidades += invoice.quantity;
    current.frete += Number(invoice.freightAmount);
    grouped.set(month, current);
  }

  return [...grouped.values()];
}

export async function getStateRanking(period?: Period) {
  const rows = await prisma.salesInvoice.groupBy({
    where: period ? { emissionDate: { gte: period.start, lte: period.end } } : {},
    by: ["state"],
    _sum: { totalAmount: true, icmsAmount: true, estimatedDifal: true },
    _count: true,
    orderBy: { _sum: { totalAmount: "desc" } },
    take: 10
  });

  return rows.map((row) => ({
    uf: row.state ?? "N/D",
    vendas: Number(row._sum.totalAmount ?? 0),
    icms: Number(row._sum.icmsAmount ?? 0),
    difal: Number(row._sum.estimatedDifal ?? 0),
    pedidos: row._count
  }));
}

export async function getRecentUploads() {
  return prisma.upload.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      originalName: true,
      type: true,
      status: true,
      rowsRead: true,
      rowsImported: true,
      rowsUpdated: true,
      errorsCount: true,
      createdAt: true
    }
  });
}
