import type { Period } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { getFeesReport, getFinancialReport, getProductsReport, getSalesReport } from "@/lib/services/report-service";

export type ReportType =
  | "sales"
  | "orders"
  | "products"
  | "commissions"
  | "fees"
  | "returns"
  | "freight"
  | "fiscal"
  | "financial"
  | "wallet"
  | "accelera"
  | "uploads";

export type ReportDefinition = {
  type: ReportType;
  title: string;
  description: string;
  fileName: string;
};

export type ReportData = ReportDefinition & {
  header: string[];
  rows: Array<Array<unknown>>;
  totalRows: number;
  chart: Array<{ label: string; value: number }>;
};

export type ReportView = "detail" | "daily" | "cumulative";

export type ReportViewOption = {
  value: ReportView;
  label: string;
  description: string;
};

export const REPORT_CATALOG: ReportDefinition[] = [
  { type: "sales", title: "Vendas", description: "Notas, pedidos, ICMS, DIFAL, frete e unidades.", fileName: "relatorio-vendas" },
  { type: "orders", title: "Pedidos", description: "Pedidos importados, datas, valores, transportadora e status.", fileName: "relatorio-pedidos" },
  { type: "products", title: "Produtos", description: "Ranking por SKU, produto, receita, comissao e devolucoes.", fileName: "relatorio-produtos" },
  { type: "commissions", title: "Comissoes", description: "Comissao, taxa de servico, transacao e afiliados.", fileName: "relatorio-comissoes" },
  { type: "fees", title: "Taxas", description: "Taxas detectadas e valores classificados por tipo.", fileName: "relatorio-taxas" },
  { type: "returns", title: "Devolucoes", description: "Reembolsos e pedidos com valores devolvidos.", fileName: "relatorio-devolucoes" },
  { type: "freight", title: "Fretes", description: "Frete pago pela Shopee, comprador, frete logistico e envio reverso.", fileName: "relatorio-fretes" },
  { type: "fiscal", title: "Fiscal", description: "Notas, UF, base fiscal, ICMS e DIFAL estimado.", fileName: "relatorio-fiscal" },
  { type: "financial", title: "Financeiro", description: "Carteira Shopee, Acelera e valores liberados.", fileName: "relatorio-financeiro" },
  { type: "wallet", title: "Carteira Shopee", description: "Entradas, saidas, ajustes, saques e saldo.", fileName: "relatorio-carteira" },
  { type: "accelera", title: "Acelera", description: "Antecipacoes, taxa de servico, recebidos e vencimentos.", fileName: "relatorio-acelera" },
  { type: "uploads", title: "Historico de uploads", description: "Arquivos processados, linhas importadas e erros.", fileName: "relatorio-uploads" }
];

export function getReportDefinition(type: string | null | undefined) {
  return REPORT_CATALOG.find((report) => report.type === type) ?? REPORT_CATALOG[0];
}

export function getReportViewOptions(typeInput: string | null | undefined): ReportViewOption[] {
  const report = getReportDefinition(typeInput);
  const noun = {
    sales: "vendas",
    orders: "pedidos",
    products: "receita",
    commissions: "comissoes",
    fees: "taxas",
    returns: "devolucoes",
    freight: "fretes",
    fiscal: "valor fiscal",
    financial: "movimentacao",
    wallet: "movimentacao da carteira",
    accelera: "Acelera",
    uploads: "importacoes"
  }[report.type];

  return [
    { value: "detail", label: "Detalhado", description: "Linhas originais do relatorio, com o maior nivel de detalhe." },
    { value: "daily", label: `Total diario de ${noun}`, description: "Agrupa os valores por dia dentro do periodo selecionado." },
    { value: "cumulative", label: `Acumulado de ${noun}`, description: "Mostra a evolucao acumulada dia a dia no periodo." }
  ];
}

export async function getReportData(typeInput: string | null | undefined, period: Period, viewInput: string | null | undefined = "detail"): Promise<ReportData> {
  const report = await getRawReportData(typeInput, period);
  return applyReportView(report, normalizeReportView(viewInput));
}

async function getRawReportData(typeInput: string | null | undefined, period: Period): Promise<ReportData> {
  const report = getReportDefinition(typeInput);

  if (report.type === "financial") {
    const data = await getFinancialReport(period);
    const rows = [
      ...data.wallet.map((row) => ["carteira", row.transactionDate.toISOString(), row.transactionType, row.orderMarketplaceId, row.direction, row.amount, row.status]),
      ...data.accelera.map((row) => ["acelera", row.rescueDate?.toISOString(), row.status, row.orderMarketplaceId, "IN", row.receivedAmount, row.rescueId]),
      ...data.income.map((row) => ["income", row.orderCreatedAt?.toISOString(), row.sku, row.orderMarketplaceId, "IN", row.releasedAmount, row.carrier])
    ];
    return withCustomChart(report, ["origem", "data", "tipo", "pedido", "direcao", "valor", "status"], rows, buildDailyChart(rows, 1, 5));
  }

  if (report.type === "products") {
    const products = await getProductsReport(period);
    const chartRows = await prisma.shopeeIncome.findMany({
      where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" }, productName: { not: "" } },
      select: { orderCreatedAt: true, releasedAmount: true, productPrice: true },
      take: 5000
    });
    return withCustomChart(
      report,
      ["sku", "produto", "linhas", "receita", "comissao", "devolucoes"],
      products.map((row) => [row.sku, row.productName, row.rows, row.revenue, row.commission, row.refunds]),
      buildDailyObjectChart(chartRows, (row) => row.orderCreatedAt, (row) => Number(row.releasedAmount ?? row.productPrice ?? 0))
    );
  }

  if (report.type === "fees") {
    const fees = await getFeesReport(period);
    const rows = await prisma.shopeeIncome.findMany({
      where: {
        orderCreatedAt: { gte: period.start, lte: period.end },
        sku: { not: "-" }
      },
      select: {
        orderCreatedAt: true,
        commissionFee: true,
        serviceFee: true,
        transactionFee: true,
        affiliateCommissionFee: true,
        reverseShippingFee: true,
        sellerReturnFee: true
      },
      take: 5000
    });
    return withCustomChart(
      report,
      ["tipo", "valor"],
      fees.totals.map((row) => [row.name, row.amount]),
      buildDailyObjectChart(rows, (row) => row.orderCreatedAt, (row) => (
        Math.abs(Number(row.commissionFee ?? 0)) +
        Math.abs(Number(row.serviceFee ?? 0)) +
        Math.abs(Number(row.transactionFee ?? 0)) +
        Math.abs(Number(row.affiliateCommissionFee ?? 0)) +
        Math.abs(Number(row.reverseShippingFee ?? 0)) +
        Math.abs(Number(row.sellerReturnFee ?? 0))
      ))
    );
  }

  if (report.type === "uploads") {
    const uploadsRaw = await prisma.upload.findMany({ orderBy: [{ processedAt: "desc" }, { createdAt: "desc" }], take: 1000 });
    const uploads = uploadsRaw.sort((left, right) => uploadImportedAt(right).getTime() - uploadImportedAt(left).getTime());
    const rows = uploads.map((row) => [(row.processedAt ?? row.createdAt).toISOString(), row.originalName, row.type, row.status, row.rowsRead, row.rowsImported, row.rowsUpdated, row.errorsCount]);
    return withCustomChart(report, ["data_importacao", "arquivo", "tipo", "status", "lidas", "importadas", "atualizadas", "erros"], rows, buildDailyChart(rows, 0, 5));
  }

  if (report.type === "wallet") {
    const rows = await prisma.walletTransaction.findMany({ where: { transactionDate: { gte: period.start, lte: period.end } }, orderBy: { transactionDate: "desc" }, take: 5000 });
    const reportRows = rows.map((row) => [row.transactionDate.toISOString(), row.transactionType, row.description, row.orderMarketplaceId, row.direction, row.amount, row.balanceAfter, row.status]);
    return withCustomChart(report, ["data", "tipo", "descricao", "pedido", "direcao", "valor", "saldo", "status"], reportRows, buildDailyChart(reportRows, 0, 5));
  }

  if (report.type === "accelera") {
    const rows = await prisma.acceleraTransaction.findMany({ where: { rescueDate: { gte: period.start, lte: period.end } }, orderBy: { rescueDate: "desc" }, take: 5000 });
    const reportRows = rows.map((row) => [row.rescueDate?.toISOString(), row.rescueId, row.orderMarketplaceId, row.rescuedAmount, row.serviceFee, row.receivedAmount, row.refundedAmount, row.status, row.dueDate?.toISOString()]);
    return withCustomChart(report, ["data", "resgate", "pedido", "resgatado", "taxa", "recebido", "reembolsado", "status", "vencimento"], reportRows, buildDailyChart(reportRows, 0, 5));
  }

  if (report.type === "commissions") {
    const rows = await prisma.shopeeIncome.findMany({ where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" } }, orderBy: { orderCreatedAt: "desc" }, take: 5000 });
    return withCustomChart(
      report,
      ["pedido", "sku", "produto", "comissao", "servico", "transacao", "afiliados"],
      rows.map((row) => [row.orderMarketplaceId, row.sku, row.productName, row.commissionFee, row.serviceFee, row.transactionFee, row.affiliateCommissionFee]),
      buildDailyObjectChart(rows, (row) => row.orderCreatedAt, (row) => Math.abs(Number(row.commissionFee ?? 0)) + Math.abs(Number(row.serviceFee ?? 0)) + Math.abs(Number(row.transactionFee ?? 0)) + Math.abs(Number(row.affiliateCommissionFee ?? 0)))
    );
  }

  if (report.type === "freight") {
    const rows = await prisma.shopeeIncome.findMany({ where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" } }, orderBy: { orderCreatedAt: "desc" }, take: 5000 });
    return withCustomChart(
      report,
      ["pedido", "sku", "produto", "transportadora", "frete_pago_shopee", "frete_comprador", "frete_logistico", "diferenca", "envio_reverso"],
      rows.map((row) => {
        const difference = Number(row.logisticsFreight ?? 0) - Number(row.shopeeShippingDiscount ?? 0) - Number(row.buyerShippingFee ?? 0);
        return [row.orderMarketplaceId, row.sku, row.productName, row.carrier, row.shopeeShippingDiscount, row.buyerShippingFee, row.logisticsFreight, difference, row.reverseShippingFee];
      }),
      buildDailyObjectChart(rows, (row) => row.orderCreatedAt, (row) => Number(row.logisticsFreight ?? 0))
    );
  }

  if (report.type === "returns") {
    const rows = await prisma.shopeeIncome.findMany({ where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" } }, orderBy: { orderCreatedAt: "desc" }, take: 5000 });
    return withCustomChart(
      report,
      ["pedido", "sku", "produto", "reembolso", "reembolsado_comprador"],
      rows.map((row) => [row.orderMarketplaceId, row.sku, row.productName, row.refundAmount, row.buyerRefundedAmount]),
      buildDailyObjectChart(rows, (row) => row.orderCreatedAt, (row) => Math.abs(Number(row.refundAmount ?? 0)) + Math.abs(Number(row.buyerRefundedAmount ?? 0)))
    );
  }

  if (report.type === "orders") {
    const rows = await prisma.order.findMany({
      where: { OR: [{ createdAtOrder: { gte: period.start, lte: period.end } }, { paidAt: { gte: period.start, lte: period.end } }] },
      orderBy: { createdAtOrder: "desc" },
      take: 5000
    });
    const reportRows = rows.map((row) => [row.marketplaceId, row.createdAtOrder?.toISOString(), row.paidAt?.toISOString(), row.state, row.buyerUsername, row.carrier, row.grossAmount, row.netAmount, row.paidAt ? "Pago" : "Pendente"]);
    return withCustomChart(report, ["pedido", "venda", "pagamento", "uf", "comprador", "transportadora", "bruto", "liquido", "status"], reportRows, buildDailyObjectChart(rows, (row) => row.createdAtOrder ?? row.paidAt, () => 1));
  }

  const invoices = await getSalesReport(period);
  const header = report.type === "fiscal"
    ? ["emissao", "documento", "pedido", "uf", "valor_total", "base", "icms", "difal"]
    : ["emissao", "documento", "pedido", "uf", "qtde", "valor_total", "frete", "icms", "difal"];
  const rows = invoices.map((invoice) => report.type === "fiscal"
    ? [invoice.emissionDate.toISOString().slice(0, 10), invoice.documentNumber, invoice.customerOrder, invoice.state ?? "", invoice.totalAmount, invoice.taxableBase, invoice.icmsAmount, invoice.estimatedDifal]
    : [invoice.emissionDate.toISOString().slice(0, 10), invoice.documentNumber, invoice.customerOrder, invoice.state ?? "", invoice.quantity, invoice.totalAmount, invoice.freightAmount, invoice.icmsAmount, invoice.estimatedDifal]
  );
  if (report.type === "sales" || report.type === "fiscal") {
    return withCustomChart(report, header, rows, buildDailyObjectChart(invoices, (invoice) => invoice.emissionDate, (invoice) => Number(invoice.totalAmount ?? 0)));
  }
  return withChart(report, header, rows, report.type === "fiscal" ? 7 : 6);
}

function normalizeReportView(value: string | null | undefined): ReportView {
  return value === "daily" || value === "cumulative" ? value : "detail";
}

function applyReportView(report: ReportData, view: ReportView): ReportData {
  if (view === "detail") return report;

  const dailyRows = report.chart.map((row) => [row.label, row.value]);
  if (view === "daily") {
    return {
      ...report,
      header: ["data", "total"],
      rows: dailyRows,
      totalRows: dailyRows.length,
      chart: report.chart
    };
  }

  let runningTotal = 0;
  const cumulativeRows = report.chart.map((row) => {
    runningTotal += row.value;
    return [row.label, row.value, runningTotal];
  });

  return {
    ...report,
    header: ["data", "total_dia", "total_acumulado"],
    rows: cumulativeRows,
    totalRows: cumulativeRows.length,
    chart: cumulativeRows.map((row) => ({ label: String(row[0]), value: Number(row[2] ?? 0) }))
  };
}

function withChart(report: ReportDefinition, header: string[], rows: Array<Array<unknown>>, valueColumn: number, labelColumn = 0): ReportData {
  return {
    ...report,
    header,
    rows,
    totalRows: rows.length,
    chart: buildChart(rows, valueColumn, labelColumn)
  };
}

function buildChart(rows: Array<Array<unknown>>, valueColumn: number, labelColumn: number) {
  return rows.slice(0, 8).map((row, index) => ({
    label: String(row[labelColumn] ?? `Linha ${index + 1}`).slice(0, 42),
    value: Math.abs(Number(row[valueColumn] ?? 0)) || 0
  }));
}

function withCustomChart(report: ReportDefinition, header: string[], rows: Array<Array<unknown>>, chart: Array<{ label: string; value: number }>): ReportData {
  return {
    ...report,
    header,
    rows,
    totalRows: rows.length,
    chart
  };
}

function buildDailyChart(rows: Array<Array<unknown>>, dateColumn: number, valueColumn: number) {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    const day = normalizeDay(row[dateColumn]);
    if (!day) continue;
    grouped.set(day, (grouped.get(day) ?? 0) + Math.abs(Number(row[valueColumn] ?? 0)));
  }

  return mapDailyGroups(grouped);
}

function buildDailyObjectChart<T>(rows: T[], getDate: (row: T) => Date | string | null | undefined, getValue: (row: T) => number) {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    const day = normalizeDay(getDate(row));
    if (!day) continue;
    grouped.set(day, (grouped.get(day) ?? 0) + Math.abs(getValue(row)));
  }

  return mapDailyGroups(grouped);
}

function mapDailyGroups(grouped: Map<string, number>) {
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([day, value]) => ({
      label: new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR"),
      value
    }));
}

function normalizeDay(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function uploadImportedAt(upload: { processedAt: Date | null; createdAt: Date }) {
  return upload.processedAt ?? upload.createdAt;
}
