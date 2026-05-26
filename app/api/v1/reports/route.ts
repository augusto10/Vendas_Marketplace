import { auth } from "@/lib/auth/auth";
import * as XLSX from "xlsx";
import { fail, handleApiError } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { parsePeriod } from "@/lib/period";
import { getFeesReport, getFinancialReport, getProductsReport, getSalesReport } from "@/lib/services/report-service";

function csvResponse(fileName: string, header: string[], lines: Array<Array<unknown>>) {
  const csv = [header, ...lines].map((line) => line.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}

function xlsxResponse(fileName: string, header: string[], lines: Array<Array<unknown>>) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([header, ...lines]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${fileName}"`
    }
  });
}

function reportResponse(format: string | null, baseName: string, header: string[], lines: Array<Array<unknown>>) {
  if (format === "xlsx") return xlsxResponse(`${baseName}.xlsx`, header, lines);
  return csvResponse(`${baseName}.csv`, header, lines);
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Login necessario.", 401);
    if (!hasPermission(session.user, "finance.export")) return fail("FORBIDDEN", "Permissao insuficiente.", 403);

    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "sales";
    const format = url.searchParams.get("format");
    const period = parsePeriod({
      start: url.searchParams.get("start") ?? undefined,
      end: url.searchParams.get("end") ?? undefined
    });

    if (type === "financial") {
      const data = await getFinancialReport(period);
      return reportResponse(
        format,
        "relatorio-financeiro",
        ["origem", "data", "tipo", "pedido", "direcao", "valor", "status"],
        [
          ...data.wallet.map((row) => ["carteira", row.transactionDate.toISOString(), row.transactionType, row.orderMarketplaceId, row.direction, row.amount, row.status]),
          ...data.accelera.map((row) => ["acelera", row.rescueDate?.toISOString(), row.status, row.orderMarketplaceId, "IN", row.receivedAmount, row.rescueId]),
          ...data.income.map((row) => ["income", row.orderCreatedAt?.toISOString(), row.sku, row.orderMarketplaceId, "IN", row.releasedAmount, row.carrier])
        ]
      );
    }

    if (type === "products") {
      const products = await getProductsReport(period);
      return reportResponse(format, "relatorio-produtos", ["sku", "produto", "linhas", "receita", "comissao", "devolucoes"], products.map((row) => [row.sku, row.productName, row.rows, row.revenue, row.commission, row.refunds]));
    }

    if (type === "fees") {
      const fees = await getFeesReport(period);
      return reportResponse(format, "relatorio-taxas", ["tipo", "valor"], fees.totals.map((row) => [row.name, row.amount]));
    }

    if (type === "uploads") {
      const uploads = await prisma.upload.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
      return reportResponse(format, "relatorio-uploads", ["data", "arquivo", "tipo", "status", "lidas", "importadas", "atualizadas", "erros"], uploads.map((row) => [row.createdAt.toISOString(), row.originalName, row.type, row.status, row.rowsRead, row.rowsImported, row.rowsUpdated, row.errorsCount]));
    }

    if (type === "wallet") {
      const rows = await prisma.walletTransaction.findMany({ where: { transactionDate: { gte: period.start, lte: period.end } }, orderBy: { transactionDate: "desc" }, take: 5000 });
      return reportResponse(format, "relatorio-carteira", ["data", "tipo", "descricao", "pedido", "direcao", "valor", "saldo", "status"], rows.map((row) => [row.transactionDate.toISOString(), row.transactionType, row.description, row.orderMarketplaceId, row.direction, row.amount, row.balanceAfter, row.status]));
    }

    if (type === "accelera") {
      const rows = await prisma.acceleraTransaction.findMany({ where: { rescueDate: { gte: period.start, lte: period.end } }, orderBy: { rescueDate: "desc" }, take: 5000 });
      return reportResponse(format, "relatorio-acelera", ["data", "resgate", "pedido", "resgatado", "taxa", "recebido", "reembolsado", "status", "vencimento"], rows.map((row) => [row.rescueDate?.toISOString(), row.rescueId, row.orderMarketplaceId, row.rescuedAmount, row.serviceFee, row.receivedAmount, row.refundedAmount, row.status, row.dueDate?.toISOString()]));
    }

    if (type === "commissions") {
      const rows = await prisma.shopeeIncome.findMany({ where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" } }, orderBy: { orderCreatedAt: "desc" }, take: 5000 });
      return reportResponse(format, "relatorio-comissoes", ["pedido", "sku", "produto", "comissao", "servico", "transacao", "afiliados"], rows.map((row) => [row.orderMarketplaceId, row.sku, row.productName, row.commissionFee, row.serviceFee, row.transactionFee, row.affiliateCommissionFee]));
    }

    if (type === "freight") {
      const rows = await prisma.shopeeIncome.findMany({ where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" } }, orderBy: { orderCreatedAt: "desc" }, take: 5000 });
      return reportResponse(format, "relatorio-fretes", ["pedido", "sku", "produto", "transportadora", "frete_logistico", "envio_reverso"], rows.map((row) => [row.orderMarketplaceId, row.sku, row.productName, row.carrier, row.logisticsFreight, row.reverseShippingFee]));
    }

    if (type === "returns") {
      const rows = await prisma.shopeeIncome.findMany({ where: { orderCreatedAt: { gte: period.start, lte: period.end }, sku: { not: "-" } }, orderBy: { orderCreatedAt: "desc" }, take: 5000 });
      return reportResponse(format, "relatorio-devolucoes", ["pedido", "sku", "produto", "reembolso", "reembolsado_comprador"], rows.map((row) => [row.orderMarketplaceId, row.sku, row.productName, row.refundAmount, row.buyerRefundedAmount]));
    }

    const invoices = await getSalesReport(period);
    return reportResponse(
      format,
      "relatorio-vendas",
      ["emissao", "documento", "pedido", "uf", "qtde", "valor_total", "frete", "icms", "difal"],
      invoices.map((invoice) => [
        invoice.emissionDate.toISOString().slice(0, 10),
        invoice.documentNumber,
        invoice.customerOrder,
        invoice.state ?? "",
        invoice.quantity,
        invoice.totalAmount,
        invoice.freightAmount,
        invoice.icmsAmount,
        invoice.estimatedDifal
      ])
    );
  } catch (error) {
    return handleApiError(error);
  }
}
