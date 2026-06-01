import { prisma } from "@/lib/prisma";
import type { Period } from "@/lib/period";

export async function getSalesReport(period: Period) {
  return prisma.salesInvoice.findMany({
    where: { emissionDate: { gte: period.start, lte: period.end } },
    orderBy: { emissionDate: "desc" },
    take: 1000
  });
}

export async function getUnifiedSalesReport(period: Period) {
  const invoices = await prisma.salesInvoice.findMany({
    where: { emissionDate: { gte: period.start, lte: period.end } },
    orderBy: { emissionDate: "desc" },
    take: 1000
  });

  const marketplaceIds = invoices.map((invoice) => invoice.customerOrder).filter((value): value is string => Boolean(value));
  const orders = marketplaceIds.length
    ? await prisma.order.findMany({
      where: { marketplaceId: { in: marketplaceIds } },
      include: { incomes: true }
    })
    : [];
  const ordersByMarketplaceId = new Map(orders.map((order) => [order.marketplaceId, order]));

  return invoices.map((invoice) => {
    const order = invoice.customerOrder ? ordersByMarketplaceId.get(invoice.customerOrder) : undefined;
    const incomes = order?.incomes ?? [];
    const shopeeGross = incomes.reduce((sum, income) => sum + Number(income.productPrice ?? 0), 0);
    const releasedAmount = incomes.reduce((sum, income) => sum + Number(income.releasedAmount ?? 0), 0);
    const commission = incomes.reduce((sum, income) => sum + Math.abs(Number(income.commissionFee ?? 0)), 0);
    const fees = incomes.reduce((sum, income) => (
      sum +
      Math.abs(Number(income.serviceFee ?? 0)) +
      Math.abs(Number(income.transactionFee ?? 0)) +
      Math.abs(Number(income.affiliateCommissionFee ?? 0))
    ), 0);
    const freight = incomes.reduce((sum, income) => (
      sum +
      Math.abs(Number(income.logisticsFreight ?? 0)) +
      Math.abs(Number(income.reverseShippingFee ?? 0))
    ), 0);
    const refunds = incomes.reduce((sum, income) => (
      sum +
      Math.abs(Number(income.refundAmount ?? 0)) +
      Math.abs(Number(income.buyerRefundedAmount ?? 0))
    ), 0);
    const products = [...new Set(incomes.map((income) => income.productName).filter(Boolean))].join(" / ");
    const skus = [...new Set(incomes.map((income) => income.sku).filter(Boolean))].join(", ");

    return {
      id: invoice.id,
      emissionDate: invoice.emissionDate,
      documentNumber: invoice.documentNumber,
      marketplaceId: invoice.customerOrder ?? "",
      state: invoice.state ?? "",
      quantity: invoice.quantity,
      fiscalTotal: Number(invoice.totalAmount),
      shopeeGross,
      releasedAmount,
      commission,
      fees,
      freight,
      refunds,
      icms: Number(invoice.icmsAmount),
      difal: Number(invoice.estimatedDifal),
      carrier: order?.carrier ?? "",
      paidAt: order?.paidAt,
      products,
      skus,
      status: order ? "Conciliado" : "Sem pedido Shopee"
    };
  });
}

type SalesOrder = Awaited<ReturnType<typeof prisma.order.findMany>>[number] & {
  incomes: Awaited<ReturnType<typeof prisma.shopeeIncome.findMany>>;
};

export type SalesConciliationDateMode = "erp" | "sale" | "payment";

function sumOrderIncomes(order?: SalesOrder) {
  const allIncomes = order?.incomes ?? [];
  const productRows = allIncomes.filter((income) => income.sku && income.sku !== "-");
  const summaryRows = allIncomes.filter((income) => !income.sku || income.sku === "-");
  const incomes = productRows.length ? productRows : allIncomes;
  const productGross = incomes.reduce((sum, income) => sum + Number(income.productPrice ?? 0), 0);
  const summaryGross = summaryRows.reduce((sum, income) => sum + Number(income.productPrice ?? 0), 0);
  const grossLogisticsFreight = incomes.reduce((sum, income) => sum + Math.abs(Number(income.logisticsFreight ?? 0)), 0);
  const buyerShippingFee = incomes.reduce((sum, income) => sum + Number(income.buyerShippingFee ?? 0), 0);
  const shopeeShippingDiscount = incomes.reduce((sum, income) => sum + Number(income.shopeeShippingDiscount ?? 0), 0);
  const reverseAndReturnFreight = incomes.reduce((sum, income) => (
    sum +
    Math.abs(Number(income.reverseShippingFee ?? 0)) +
    Math.abs(Number(income.sellerReturnFee ?? 0))
  ), 0);
  const sellerFreightCost = Math.max(0, grossLogisticsFreight - buyerShippingFee - shopeeShippingDiscount) + reverseAndReturnFreight;
  return {
    shopeeGross: productGross || summaryGross,
    releasedAmount: incomes.reduce((sum, income) => sum + Number(income.releasedAmount ?? 0), 0),
    commission: incomes.reduce((sum, income) => sum + Math.abs(Number(income.commissionFee ?? 0)), 0),
    serviceFee: incomes.reduce((sum, income) => sum + Math.abs(Number(income.serviceFee ?? 0)), 0),
    transactionFee: incomes.reduce((sum, income) => sum + Math.abs(Number(income.transactionFee ?? 0)), 0),
    affiliateCommissionFee: incomes.reduce((sum, income) => sum + Math.abs(Number(income.affiliateCommissionFee ?? 0)), 0),
    freight: sellerFreightCost,
    logisticsFreight: grossLogisticsFreight,
    buyerShippingFee,
    shopeeShippingDiscount,
    refunds: incomes.reduce((sum, income) => (
      sum +
      Math.abs(Number(income.refundAmount ?? 0)) +
      Math.abs(Number(income.buyerRefundedAmount ?? 0))
    ), 0),
    products: [...new Set(incomes.map((income) => income.productName).filter(Boolean))].join(" / "),
    skus: [...new Set(incomes.map((income) => income.sku).filter(Boolean))].join(", ")
  };
}

function startOfLocalDay(date?: Date | null) {
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function differenceInDays(left?: Date | null, right?: Date | null) {
  const leftDay = startOfLocalDay(left);
  const rightDay = startOfLocalDay(right);
  if (!leftDay || !rightDay) return null;
  return Math.round((leftDay.getTime() - rightDay.getTime()) / 86400000);
}

export async function getSalesConciliationReport(period: Period, page = 1, pageSize = 50, status = "all", dateMode: SalesConciliationDateMode = "erp") {
  const currentPage = Math.max(1, page);
  const shopeePeriodWhere = dateMode === "payment"
    ? { paidAt: { gte: period.start, lte: period.end } }
    : { createdAtOrder: { gte: period.start, lte: period.end } };
  const periodShopeeOrders = dateMode === "erp"
    ? []
    : await prisma.order.findMany({
      where: shopeePeriodWhere,
      include: { incomes: true, invoices: true }
    });
  const periodShopeeOrderIds = periodShopeeOrders.map((order) => order.marketplaceId);
  const invoices = await prisma.salesInvoice.findMany({
    where: dateMode === "erp"
      ? { emissionDate: { gte: period.start, lte: period.end } }
      : periodShopeeOrderIds.length
        ? { customerOrder: { in: periodShopeeOrderIds } }
        : { id: "__none__" },
    orderBy: { emissionDate: "desc" }
  });
  const [walletAgg, walletAdjustments, acceleraAgg] = await Promise.all([
    prisma.walletTransaction.groupBy({
      where: { transactionDate: { gte: period.start, lte: period.end } },
      by: ["direction", "transactionType"],
      _sum: { amount: true }
    }),
    prisma.walletTransaction.findMany({
      where: {
        transactionDate: { gte: period.start, lte: period.end },
        transactionType: { contains: "Ajuste", mode: "insensitive" }
      },
      select: {
        orderMarketplaceId: true,
        description: true,
        direction: true,
        amount: true
      }
    }),
    prisma.acceleraTransaction.aggregate({
      where: { rescueDate: { gte: period.start, lte: period.end } },
      _sum: { receivedAmount: true, serviceFee: true, refundedAmount: true }
    })
  ]);

  const fiscalMarketplaceIds = invoices.map((invoice) => invoice.customerOrder).filter((value): value is string => Boolean(value));
  const shopeeOrders = dateMode === "erp"
    ? await prisma.order.findMany({
      where: {
        OR: [
          { marketplaceId: { in: fiscalMarketplaceIds } },
          { createdAtOrder: { gte: period.start, lte: period.end } },
          { paidAt: { gte: period.start, lte: period.end } }
        ]
      },
      include: { incomes: true, invoices: true }
    })
    : periodShopeeOrders;
  const ordersByMarketplaceId = new Map(shopeeOrders.map((order) => [order.marketplaceId, order]));
  const shopeeOrdersInPeriod = dateMode === "erp"
    ? shopeeOrders.filter((order) => (
      (order.createdAtOrder && order.createdAtOrder >= period.start && order.createdAtOrder <= period.end) ||
      (order.paidAt && order.paidAt >= period.start && order.paidAt <= period.end)
    ))
    : shopeeOrders;
  const adjustmentsByOrder = new Map<string, { total: number; difal: number; refunds: number; credits: number; descriptions: Set<string> }>();
  const adjustmentTotals = { total: 0, difal: 0, refunds: 0, credits: 0, other: 0 };
  for (const adjustment of walletAdjustments) {
    const amount = Number(adjustment.amount ?? 0);
    const description = adjustment.description ?? "Ajuste";
    const normalized = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const isDifal = normalized.includes("DIFAL") || normalized.includes("ICMS PARA UF DESTINO");
    const isRefund = normalized.includes("REEMBOLSO") || normalized.includes("DEVOLUCAO") || normalized.includes("RETURN/REFUND");
    const isCredit = adjustment.direction === "IN";

    adjustmentTotals.total += amount;
    if (isDifal) adjustmentTotals.difal += Math.abs(amount);
    else if (isRefund) adjustmentTotals.refunds += Math.abs(amount);
    else if (isCredit) adjustmentTotals.credits += Math.abs(amount);
    else adjustmentTotals.other += Math.abs(amount);

    const marketplaceId = adjustment.orderMarketplaceId ?? "";
    if (!marketplaceId) continue;
    const current = adjustmentsByOrder.get(marketplaceId) ?? { total: 0, difal: 0, refunds: 0, credits: 0, descriptions: new Set<string>() };
    current.total += amount;
    if (isDifal) current.difal += Math.abs(amount);
    else if (isRefund) current.refunds += Math.abs(amount);
    else if (isCredit) current.credits += Math.abs(amount);
    current.descriptions.add(description);
    adjustmentsByOrder.set(marketplaceId, current);
  }

  const rows = invoices.map((invoice) => {
    const order = invoice.customerOrder ? ordersByMarketplaceId.get(invoice.customerOrder) : undefined;
    const income = sumOrderIncomes(order);
    const adjustment = adjustmentsByOrder.get(invoice.customerOrder ?? "");
    const daysFromShopeeOrderToInvoice = differenceInDays(invoice.emissionDate, order?.createdAtOrder);
    const daysFromInvoiceToPayment = differenceInDays(order?.paidAt, invoice.emissionDate);
    return {
      id: invoice.id,
      emissionDate: invoice.emissionDate,
      orderCreatedAt: order?.createdAtOrder,
      documentNumber: invoice.documentNumber,
      marketplaceId: invoice.customerOrder ?? "",
      state: invoice.state ?? "",
      quantity: invoice.quantity,
      fiscalTotal: Number(invoice.totalAmount),
      fiscalFreight: Number(invoice.freightAmount),
      fiscalProductTotal: Number(invoice.totalAmount) - Number(invoice.freightAmount),
      shopeeGross: income.shopeeGross,
      releasedAmount: income.releasedAmount,
      commission: income.commission,
      serviceFee: income.serviceFee,
      transactionFee: income.transactionFee,
      affiliateCommissionFee: income.affiliateCommissionFee,
      fees: income.serviceFee + income.transactionFee + income.affiliateCommissionFee,
      freight: income.freight,
      logisticsFreight: income.logisticsFreight,
      buyerShippingFee: income.buyerShippingFee,
      shopeeShippingDiscount: income.shopeeShippingDiscount,
      refunds: income.refunds,
      walletAdjustment: adjustment?.total ?? 0,
      walletAdjustmentDifal: adjustment?.difal ?? 0,
      walletAdjustmentRefunds: adjustment?.refunds ?? 0,
      walletAdjustmentCredits: adjustment?.credits ?? 0,
      walletAdjustmentDescriptions: [...(adjustment?.descriptions ?? [])].join(" / "),
      icms: Number(invoice.icmsAmount),
      difal: Number(invoice.estimatedDifal),
      estimatedNetProfit: income.releasedAmount + (adjustment?.total ?? 0),
      carrier: order?.carrier ?? "",
      paidAt: order?.paidAt,
      daysFromShopeeOrderToInvoice,
      daysFromInvoiceToPayment,
      products: income.products,
      skus: income.skus,
      difference: Number(invoice.totalAmount) - Number(invoice.freightAmount) - income.shopeeGross,
      status: order ? "Conciliado" : "Sem pedido Shopee"
    };
  });

  const reconciledRows = rows.filter((row) => row.status === "Conciliado");
  const fiscalOnlyRows = rows.filter((row) => row.status !== "Conciliado");
  const dateMatchedRows = reconciledRows.filter((row) => row.daysFromShopeeOrderToInvoice !== null && Math.abs(row.daysFromShopeeOrderToInvoice) <= 3);
  const dateDivergentRows = reconciledRows.filter((row) => row.daysFromShopeeOrderToInvoice !== null && Math.abs(row.daysFromShopeeOrderToInvoice) > 3);
  const paidAfterInvoiceRows = reconciledRows.filter((row) => row.daysFromInvoiceToPayment !== null && row.daysFromInvoiceToPayment >= 0);
  const fiscalOrderIds = new Set(fiscalMarketplaceIds);
  const shopeeOnlyOrders = shopeeOrdersInPeriod.filter((order) => !fiscalOrderIds.has(order.marketplaceId));
  const shopeeOnlyTotals = shopeeOnlyOrders.reduce((totals, order) => {
    const income = sumOrderIncomes(order);
    totals.shopeeGross += income.shopeeGross;
    totals.releasedAmount += income.releasedAmount;
    return totals;
  }, { shopeeGross: 0, releasedAmount: 0 });
  const walletIn = walletAgg.filter((entry) => entry.direction === "IN").reduce((sum, entry) => sum + Number(entry._sum.amount ?? 0), 0);
  const walletOut = walletAgg.filter((entry) => entry.direction === "OUT").reduce((sum, entry) => sum + Number(entry._sum.amount ?? 0), 0);
  const withdrawals = walletAgg
    .filter((entry) => entry.direction === "OUT" && entry.transactionType.toUpperCase().includes("SAQUES"))
    .reduce((sum, entry) => sum + Math.abs(Number(entry._sum.amount ?? 0)), 0);
  const ads = walletAgg
    .filter((entry) => entry.direction === "OUT" && entry.transactionType.toUpperCase().includes("PAGAMENTO"))
    .reduce((sum, entry) => sum + Math.abs(Number(entry._sum.amount ?? 0)), 0);

  const summary = {
    fiscalOrders: rows.length,
    shopeeOrders: shopeeOrdersInPeriod.length,
    reconciledOrders: reconciledRows.length,
    dateMatchedOrders: dateMatchedRows.length,
    dateDivergentOrders: dateDivergentRows.length,
    paidAfterInvoiceOrders: paidAfterInvoiceRows.length,
    fiscalOnlyOrders: fiscalOnlyRows.length,
    shopeeOnlyOrders: shopeeOnlyOrders.length,
    fiscalTotal: rows.reduce((sum, row) => sum + row.fiscalTotal, 0),
    fiscalFreight: rows.reduce((sum, row) => sum + row.fiscalFreight, 0),
    fiscalProductTotal: rows.reduce((sum, row) => sum + row.fiscalProductTotal, 0),
    shopeeGross: shopeeOrdersInPeriod.reduce((sum, order) => sum + sumOrderIncomes(order).shopeeGross, 0),
    releasedAmount: shopeeOrdersInPeriod.reduce((sum, order) => sum + sumOrderIncomes(order).releasedAmount, 0),
    reconciledFiscalTotal: reconciledRows.reduce((sum, row) => sum + row.fiscalTotal, 0),
    reconciledShopeeGross: reconciledRows.reduce((sum, row) => sum + row.shopeeGross, 0),
    reconciledReleasedAmount: reconciledRows.reduce((sum, row) => sum + row.releasedAmount, 0),
    fiscalOnlyTotal: fiscalOnlyRows.reduce((sum, row) => sum + row.fiscalTotal, 0),
    fiscalOnlyProductTotal: fiscalOnlyRows.reduce((sum, row) => sum + row.fiscalProductTotal, 0),
    shopeeOnlyGross: shopeeOnlyTotals.shopeeGross,
    shopeeOnlyReleased: shopeeOnlyTotals.releasedAmount,
    reconciledFiscalFreight: reconciledRows.reduce((sum, row) => sum + row.fiscalFreight, 0),
    reconciledFiscalProductTotal: reconciledRows.reduce((sum, row) => sum + row.fiscalProductTotal, 0),
    totalDifference: rows.reduce((sum, row) => sum + row.difference, 0),
    reconciledDifference: reconciledRows.reduce((sum, row) => sum + row.difference, 0),
    commission: rows.reduce((sum, row) => sum + row.commission, 0),
    serviceFee: rows.reduce((sum, row) => sum + row.serviceFee, 0),
    transactionFee: rows.reduce((sum, row) => sum + row.transactionFee, 0),
    affiliateCommissionFee: rows.reduce((sum, row) => sum + row.affiliateCommissionFee, 0),
    fees: rows.reduce((sum, row) => sum + row.fees, 0),
    freight: rows.reduce((sum, row) => sum + row.freight, 0),
    refunds: rows.reduce((sum, row) => sum + row.refunds, 0),
    walletAdjustments: Math.abs(adjustmentTotals.total),
    walletAdjustmentsNet: adjustmentTotals.total,
    walletAdjustmentDifal: adjustmentTotals.difal,
    walletAdjustmentRefunds: adjustmentTotals.refunds,
    walletAdjustmentCredits: adjustmentTotals.credits,
    walletAdjustmentOther: adjustmentTotals.other,
    icms: rows.reduce((sum, row) => sum + row.icms, 0),
    difal: rows.reduce((sum, row) => sum + row.difal, 0),
    unitsSold: rows.reduce((sum, row) => sum + row.quantity, 0),
    reconciledUnitsSold: reconciledRows.reduce((sum, row) => sum + row.quantity, 0),
    estimatedNetProfit: rows.reduce((sum, row) => sum + row.estimatedNetProfit, 0),
    walletIn,
    walletOut: Math.abs(walletOut),
    walletNet: walletIn + walletOut,
    withdrawals,
    ads,
    acceleraReceived: Number(acceleraAgg._sum.receivedAmount ?? 0),
    acceleraFees: Number(acceleraAgg._sum.serviceFee ?? 0),
    acceleraRefunded: Number(acceleraAgg._sum.refundedAmount ?? 0)
  };

  const filteredRows = status === "matched"
    ? rows.filter((row) => row.status === "Conciliado")
    : status === "missing"
      ? rows.filter((row) => row.status !== "Conciliado")
      : rows;

  return {
    rows: filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    summary,
    pagination: {
      page: currentPage,
      pageSize,
      totalRows: filteredRows.length,
      totalPages: Math.max(1, Math.ceil(filteredRows.length / pageSize))
    }
  };
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
  const [detected, incomeRows, serviceFeeDetails] = await Promise.all([
    prisma.detectedFee.findMany({ orderBy: [{ status: "asc" }, { lastSeenAt: "desc" }] }),
    prisma.shopeeIncome.findMany({
      where: {
        sku: { not: "-" },
        OR: [
          { orderCreatedAt: { gte: period.start, lte: period.end } },
          { paymentCompletedAt: { gte: period.start, lte: period.end } }
        ]
      },
      select: {
        commissionFee: true,
        serviceFee: true,
        transactionFee: true,
        affiliateCommissionFee: true,
        reverseShippingFee: true,
        sellerReturnFee: true
      }
    }),
    prisma.serviceFeeDetail.groupBy({
      by: ["feeName"],
      where: {
        occurredAt: { gte: period.start, lte: period.end },
        amount: { not: 0 }
      },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { feeName: "asc" }
    })
  ]);
  const incomeTotals = [
    feeTotal("Comissao", "Income", incomeRows.map((row) => Number(row.commissionFee ?? 0))),
    feeTotal("Servico", "Income", incomeRows.map((row) => Number(row.serviceFee ?? 0))),
    feeTotal("Transacao", "Income", incomeRows.map((row) => Number(row.transactionFee ?? 0))),
    feeTotal("Afiliados", "Income", incomeRows.map((row) => Number(row.affiliateCommissionFee ?? 0))),
    feeTotal("Envio reverso", "Income", incomeRows.map((row) => Number(row.reverseShippingFee ?? 0))),
    feeTotal("Devolucao vendedor", "Income", incomeRows.map((row) => Number(row.sellerReturnFee ?? 0)))
  ];
  const detailTotals = serviceFeeDetails.map((row) => ({
    name: row.feeName,
    source: "Detalhe de taxas",
    amount: Number(row._sum.amount ?? 0),
    count: row._count._all
  }));
  const totals = [...incomeTotals, ...detailTotals]
    .filter((row) => row.count > 0 || row.amount !== 0)
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount));

  return {
    detected,
    totals
  };
}

function feeTotal(name: string, source: string, values: number[]) {
  const nonZeroValues = values.filter((value) => value !== 0);
  return {
    name,
    source,
    amount: nonZeroValues.reduce((sum, value) => sum + value, 0),
    count: nonZeroValues.length
  };
}

export async function getFiscalRules() {
  return prisma.stateTaxRule.findMany({ orderBy: [{ uf: "asc" }, { validFrom: "desc" }] });
}
