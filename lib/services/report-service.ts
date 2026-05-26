import { prisma } from "@/lib/prisma";
import type { Period } from "@/lib/period";

export async function getSalesReport(period: Period) {
  return prisma.salesInvoice.findMany({
    where: { emissionDate: { gte: period.start, lte: period.end } },
    orderBy: { emissionDate: "desc" },
    take: 1000
  });
}

export async function getFinancialReport(period: Period) {
  const [wallet, accelera, income] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { transactionDate: { gte: period.start, lte: period.end } },
      orderBy: { transactionDate: "desc" },
      take: 5000
    }),
    prisma.acceleraTransaction.findMany({
      where: { rescueDate: { gte: period.start, lte: period.end } },
      orderBy: { rescueDate: "desc" },
      take: 5000
    }),
    prisma.shopeeIncome.findMany({
      where: {
        sku: { not: "-" },
        OR: [
          { orderCreatedAt: { gte: period.start, lte: period.end } },
          { paymentCompletedAt: { gte: period.start, lte: period.end } }
        ]
      },
      orderBy: { orderCreatedAt: "desc" },
      take: 5000
    })
  ]);

  return { wallet, accelera, income };
}

export async function getProductsReport(period: Period) {
  const rows = await prisma.shopeeIncome.findMany({
    where: {
      orderCreatedAt: { gte: period.start, lte: period.end },
      sku: { not: "-" },
      productName: { not: "" }
    },
    select: {
      sku: true,
      productName: true,
      productPrice: true,
      commissionFee: true,
      refundAmount: true,
      releasedAmount: true,
      orderCreatedAt: true
    },
    take: 5000
  });

  const grouped = new Map<string, { sku: string; productName: string; revenue: number; commission: number; refunds: number; rows: number; firstDate?: Date; lastDate?: Date }>();
  for (const row of rows) {
    const key = `${row.sku ?? "N/D"}-${row.productName ?? "Produto"}`;
    const current = grouped.get(key) ?? {
      sku: row.sku ?? "N/D",
      productName: row.productName ?? "Produto",
      revenue: 0,
      commission: 0,
      refunds: 0,
      rows: 0,
      firstDate: undefined,
      lastDate: undefined
    };
    const rowDate = "orderCreatedAt" in row ? row.orderCreatedAt : undefined;
    current.revenue += Number(row.releasedAmount ?? row.productPrice ?? 0);
    current.commission += Number(row.commissionFee ?? 0);
    current.refunds += Number(row.refundAmount ?? 0);
    current.rows += 1;
    if (rowDate) {
      if (!current.firstDate || rowDate < current.firstDate) current.firstDate = rowDate;
      if (!current.lastDate || rowDate > current.lastDate) current.lastDate = rowDate;
    }
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 50);
}

export async function getFeesReport(period: Period) {
  const [detected, income] = await Promise.all([
    prisma.detectedFee.findMany({ orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }] }),
    prisma.shopeeIncome.aggregate({
      where: {
        sku: { not: "-" },
        OR: [
          { orderCreatedAt: { gte: period.start, lte: period.end } },
          { paymentCompletedAt: { gte: period.start, lte: period.end } }
        ]
      },
      _sum: {
        commissionFee: true,
        serviceFee: true,
        transactionFee: true,
        affiliateCommissionFee: true,
        reverseShippingFee: true,
        sellerReturnFee: true
      }
    })
  ]);

  return {
    detected,
    totals: [
      { name: "Comissao", amount: Number(income._sum.commissionFee ?? 0) },
      { name: "Servico", amount: Number(income._sum.serviceFee ?? 0) },
      { name: "Transacao", amount: Number(income._sum.transactionFee ?? 0) },
      { name: "Afiliados", amount: Number(income._sum.affiliateCommissionFee ?? 0) },
      { name: "Envio reverso", amount: Number(income._sum.reverseShippingFee ?? 0) },
      { name: "Devolucao vendedor", amount: Number(income._sum.sellerReturnFee ?? 0) }
    ]
  };
}

export async function getFiscalRules() {
  return prisma.stateTaxRule.findMany({ orderBy: [{ uf: "asc" }, { validFrom: "desc" }] });
}
