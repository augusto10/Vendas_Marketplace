import { prisma } from "@/lib/prisma";
import type { Period } from "@/lib/period";
import { getSalesConciliationReport, type SalesConciliationDateMode } from "@/lib/services/report-service";

export type DashboardMetrics = {
  soldAmount: number;
  shopeeSoldAmount: number;
  receivedAmount: number;
  unitsSold: number;
  paidUnitsSold: number;
  orders: number;
  paidOrders: number;
  unpaidOrders: number;
  averageTicket: number;
  commission: number;
  serviceFee: number;
  affiliateCommissionFee: number;
  fees: number;
  freight: number;
  refunds: number;
  icms: number;
  difal: number;
};

export async function getDashboardMetrics(period: Period, dateMode: SalesConciliationDateMode = "erp"): Promise<DashboardMetrics> {
  const { summary } = await getSalesConciliationReport(period, 1, 1, "all", dateMode);
  return {
    soldAmount: summary.fiscalTotal,
    shopeeSoldAmount: summary.shopeeGross,
    receivedAmount: summary.reconciledReleasedAmount,
    unitsSold: summary.unitsSold,
    paidUnitsSold: summary.reconciledUnitsSold,
    orders: summary.fiscalOrders,
    paidOrders: summary.reconciledOrders,
    unpaidOrders: summary.fiscalOnlyOrders,
    averageTicket: summary.fiscalOrders ? summary.fiscalTotal / summary.fiscalOrders : 0,
    commission: summary.commission,
    serviceFee: summary.serviceFee,
    affiliateCommissionFee: summary.affiliateCommissionFee,
    fees: summary.fees,
    freight: summary.freight,
    refunds: summary.refunds,
    icms: summary.icms,
    difal: summary.difal
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

export async function getStateRanking(period: Period, dateMode: SalesConciliationDateMode = "erp") {
  const { rows } = await getSalesConciliationReport(period, 1, 100000, "all", dateMode);
  const grouped = new Map<string, { uf: string; vendas: number; icms: number; difal: number; pedidos: number }>();
  for (const row of rows) {
    const uf = row.state || "N/D";
    const current = grouped.get(uf) ?? { uf, vendas: 0, icms: 0, difal: 0, pedidos: 0 };
    current.vendas += row.fiscalTotal;
    current.icms += row.icms;
    current.difal += row.difal;
    current.pedidos += 1;
    grouped.set(uf, current);
  }

  return [...grouped.values()]
    .sort((left, right) => right.vendas - left.vendas)
    .slice(0, 10);
}

export async function getRecentUploads() {
  const uploads = await prisma.upload.findMany({
    orderBy: [{ processedAt: "desc" }, { createdAt: "desc" }],
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
      processedAt: true,
      createdAt: true
    }
  });
  return uploads.sort((left, right) => uploadImportedAt(right).getTime() - uploadImportedAt(left).getTime());
}

function uploadImportedAt(upload: { processedAt: Date | null; createdAt: Date }) {
  return upload.processedAt ?? upload.createdAt;
}
