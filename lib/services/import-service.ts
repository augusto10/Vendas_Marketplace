import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import type { UploadType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { detectUploadType } from "@/lib/importers/detector";
import { parseFile } from "@/lib/importers/parser";
import { date, get, hashRow, int, money, normalizeHeader, normalizeRow } from "@/lib/importers/normalizers";
import { estimateDifal } from "@/lib/services/fiscal-service";
import type { ImportSummary, ParsedSheet } from "@/types/imports";

function periodFromDates(dates: Array<Date | null>) {
  const valid = dates.filter((item): item is Date => Boolean(item)).sort((a, b) => a.getTime() - b.getTime());
  return { periodStart: valid[0], periodEnd: valid[valid.length - 1] };
}

function pickRows(sheets: ParsedSheet[]) {
  return sheets.flatMap((sheet) => sheet.rows.map((row) => ({ sheet: sheet.name, row: normalizeRow(row) })));
}

async function persistFile(file: File, checksum: string) {
  const uploadDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadDir, { recursive: true });
  const extension = file.name.split(".").pop() ?? "bin";
  const storagePath = path.join(uploadDir, `${checksum}.${extension}`);
  await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));
  return storagePath;
}

async function checksum(file: File) {
  return createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
}

export async function importMarketplaceFile(file: File, uploadedById?: string): Promise<ImportSummary> {
  const fileChecksum = await checksum(file);
  const sheets = await parseFile(file);
  const type = detectUploadType(sheets);
  const storagePath = await persistFile(file, fileChecksum);

  const upload = await prisma.upload.upsert({
    where: { checksum_type: { checksum: fileChecksum, type } },
    update: { status: "PROCESSING", originalName: file.name, storagePath, uploadedById },
    create: { checksum: fileChecksum, type, originalName: file.name, storagePath, status: "PROCESSING", uploadedById }
  });
  await prisma.importError.deleteMany({ where: { uploadId: upload.id } });

  const summary: ImportSummary = {
    uploadId: upload.id,
    type,
    rowsRead: 0,
    rowsImported: 0,
    rowsUpdated: 0,
    errors: [],
    detectedFees: []
  };

  try {
    if (type === "FISCAL_INVOICE") await importFiscal(sheets, summary);
    if (type === "SHOPEE_WALLET") await importWallet(sheets, summary);
    if (type === "SHOPEE_ACCELERA") await importAccelera(sheets, summary);
    if (type === "SHOPEE_INCOME") await importIncome(sheets, summary);
    if (type === "UNKNOWN") throw new Error("Tipo de planilha nao reconhecido.");

    await prisma.importError.createMany({
      data: summary.errors.map((error) => ({
        uploadId: upload.id,
        rowNumber: error.rowNumber,
        field: error.field,
        message: error.message,
        rawData: error.rawData as object
      }))
    });

    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: summary.errors.length ? "FAILED" : "COMPLETED",
        rowsRead: summary.rowsRead,
        rowsImported: summary.rowsImported,
        rowsUpdated: summary.rowsUpdated,
        errorsCount: summary.errors.length,
        detectedFees: summary.detectedFees.length,
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        processedAt: new Date(),
        summary: summary as unknown as object
      }
    });
  } catch (error) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: { status: "FAILED", errorsCount: summary.errors.length + 1, processedAt: new Date() }
    });
    throw error;
  }

  return summary;
}

export async function reprocessUpload(uploadId: string, actorId?: string) {
  const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
  if (!upload?.storagePath) throw new Error("Upload sem arquivo original salvo.");
  const { readFile } = await import("fs/promises");
  const data = await readFile(upload.storagePath);
  const file = new File([data], upload.originalName);
  return importMarketplaceFile(file, actorId);
}

async function importFiscal(sheets: ParsedSheet[], summary: ImportSummary) {
  const rows = pickRows(sheets);
  const dates: Array<Date | null> = [];
  let rowNumber = 1;
  for (const { row } of rows) {
    rowNumber += 1;
    summary.rowsRead++;
    const emissionDate = date(get(row, "EMISSAO"));
    dates.push(emissionDate);
    const documentNumber = String(get(row, "DOCTO/SER") ?? "").trim();
    if (!emissionDate || !documentNumber) {
      summary.errors.push({ rowNumber, field: "EMISSAO/DOCTO/SER", message: "Linha fiscal sem data ou documento.", rawData: row });
      continue;
    }
    const taxableBase = money(get(row, "BASE CALC"));
    const state = String(get(row, "UF") ?? "").trim().toUpperCase();
    const estimatedDifal = await estimateDifal(state, taxableBase, emissionDate);
    const existing = await prisma.salesInvoice.findUnique({
      where: { documentNumber_emissionDate_branch: { documentNumber, emissionDate, branch: String(get(row, "FIL") ?? "") } }
    });
    if (existing) {
      summary.rowsUpdated++;
      continue;
    }
    const order = await prisma.order.findUnique({ where: { marketplaceId: String(get(row, "PEDIDO CLIENTE") ?? "") } });
    await prisma.salesInvoice.create({
      data: {
        documentNumber,
        emissionDate,
        branch: String(get(row, "FIL") ?? ""),
        type: String(get(row, "TP") ?? ""),
        customerOrder: String(get(row, "PEDIDO CLIENTE") ?? ""),
        quantity: int(get(row, "QTDE")),
        cfop: String(get(row, "CFOP") ?? ""),
        state,
        totalAmount: money(get(row, "VR TOTAL")),
        freightAmount: money(get(row, "VR FRETE")),
        icmsRate: money(get(row, "ALIQ. ICMS")),
        taxableBase,
        icmsAmount: money(get(row, "VR ICMS")),
        estimatedDifal,
        orderId: order?.id
      }
    });
    summary.rowsImported++;
  }
  Object.assign(summary, periodFromDates(dates));
}

async function importWallet(sheets: ParsedSheet[], summary: ImportSummary) {
  const rows = pickRows(sheets);
  const dates: Array<Date | null> = [];
  let rowNumber = 1;
  for (const { row } of rows) {
    rowNumber += 1;
    summary.rowsRead++;
    const transactionDate = date(get(row, "Data"));
    dates.push(transactionDate);
    if (!transactionDate) {
      summary.errors.push({ rowNumber, field: "Data", message: "Transacao sem data.", rawData: row });
      continue;
    }
    const rawHash = hashRow(row);
    const existing = await prisma.walletTransaction.findUnique({ where: { rawHash } });
    if (existing) {
      summary.rowsUpdated++;
      continue;
    }
    const directionText = normalizeHeader(get(row, "Direcao do dinheiro"));
    const data = {
      transactionDate,
      transactionType: String(get(row, "Tipo de transacao") ?? ""),
      description: String(get(row, "Descricao") ?? ""),
      orderMarketplaceId: String(get(row, "ID do pedido") ?? ""),
      direction: directionText.includes("SAIDA") ? "OUT" as const : directionText.includes("ENTRADA") ? "IN" as const : "NEUTRAL" as const,
      amount: money(get(row, "Valor")),
      status: String(get(row, "Status") ?? ""),
      balanceAfter: money(get(row, "Balanca apos as transacoes")),
      adjustmentValue: money(get(row, "Valor a Ser Ajustado"))
    };
    await prisma.walletTransaction.create({
      data: {
        rawHash,
        ...data
      }
    });
    summary.rowsImported++;
  }
  Object.assign(summary, periodFromDates(dates));
}

async function importAccelera(sheets: ParsedSheet[], summary: ImportSummary) {
  const rows = pickRows(sheets);
  const dates: Array<Date | null> = [];
  let rowNumber = 1;
  await detectFee("SHOPEE_ACCELERA", "Taxa de Servico", summary);
  for (const { row } of rows) {
    rowNumber += 1;
    summary.rowsRead++;
    const rescueDate = date(get(row, "Data do resgate rapido"));
    dates.push(rescueDate);
    const rawHash = hashRow(row);
    const existing = await prisma.acceleraTransaction.findUnique({ where: { rawHash } });
    if (existing) {
      summary.rowsUpdated++;
      continue;
    }
    await prisma.acceleraTransaction.create({
      data: {
        rawHash,
        rescueDate,
        rescueId: String(get(row, "ID do resgate rapido") ?? ""),
        orderMarketplaceId: String(get(row, "ID do pedido") ?? ""),
        availableAmount: acceleraMoney(get(row, "Valor de pedidos disponivel para resgate rapido")),
        rescuePercent: money(get(row, "Percentual de resgate rapido")),
        rescuedAmount: acceleraMoney(get(row, "Valor dos resgates rapidos")),
        serviceFee: acceleraMoney(get(row, "Taxa de Servico")),
        receivedAmount: acceleraMoney(get(row, "Valor recebido")),
        remainingAmount: acceleraMoney(get(row, "Valor restante para pagamento")),
        refundedAmount: acceleraMoney(get(row, "Valor reembolsado")),
        orderGrossAmount: acceleraMoney(get(row, "Faturamento total do pedido")),
        pendingAmount: acceleraMoney(get(row, "Valor pendente")),
        status: String(get(row, "Status") ?? ""),
        lastTransactionAt: date(get(row, "Data da ultima transacao")),
        dueDate: date(get(row, "Data de vencimento"))
      }
    });
    summary.rowsImported++;
  }
  Object.assign(summary, periodFromDates(dates));
}

function acceleraMoney(value: unknown): number {
  const parsed = money(value);
  const text = String(value ?? "");
  if (typeof value === "number" || /^\d+$/.test(text.trim())) return parsed / 100;
  return parsed;
}

async function importIncome(sheets: ParsedSheet[], summary: ImportSummary) {
  const rows = pickRows(sheets);
  const dates: Array<Date | null> = [];
  let rowNumber = 1;
  const detectedFeeNames = new Set<string>();
  for (const { sheet, row } of rows) {
    rowNumber += 1;
    summary.rowsRead++;
    if (/adjustment/i.test(sheet)) {
      const orderMarketplaceId = String(get(row, "Numero do pedido relacionado", "Número do pedido relacionado", "ID do pedido") ?? "").trim();
      const amount = money(get(row, "Valor do ajuste"));
      const occurredAt = date(get(row, "Data de conclusao do ajuste", "Data de conclusão do ajuste"));
      dates.push(occurredAt);
      if (!orderMarketplaceId || !amount) continue;
      const rawHash = hashRow({ sheet, row });
      const existing = await prisma.adjustment.findUnique({ where: { rawHash } });
      if (existing) {
        summary.rowsUpdated++;
        continue;
      }
      await prisma.adjustment.create({
        data: {
          rawHash,
          orderMarketplaceId,
          description: String(get(row, "Tipo/Descricao do ajuste", "Tipo/Descrição do ajuste") ?? ""),
          reason: String(get(row, "Motivo do ajuste") ?? ""),
          amount,
          occurredAt
        }
      });
      summary.rowsImported++;
      continue;
    }

    if (/service fee/i.test(sheet)) {
      const feeName = String(get(row, "Nome da taxa", "Tipo de taxa", "Taxa") ?? "Taxa de servico");
      const rawHash = hashRow({ sheet, row });
      const existing = await prisma.serviceFeeDetail.findUnique({ where: { rawHash } });
      if (existing) {
        summary.rowsUpdated++;
        continue;
      }
      await prisma.serviceFeeDetail.create({
        data: {
          rawHash,
          orderMarketplaceId: String(get(row, "ID do pedido") ?? ""),
          feeName,
          amount: money(get(row, "Valor", "Taxa de servico")),
          occurredAt: date(get(row, "Data", "Data de criacao do pedido"))
        }
      });
      if (!detectedFeeNames.has(feeName)) {
        detectedFeeNames.add(feeName);
        await detectFee("SHOPEE_INCOME", feeName, summary);
      }
      summary.rowsImported++;
      continue;
    }

    const orderMarketplaceId = String(get(row, "ID do pedido") ?? "").trim();
    if (!orderMarketplaceId) continue;
    const orderCreatedAt = date(get(row, "Data de criacao do pedido"));
    dates.push(orderCreatedAt);
    const rawHash = hashRow({ sheet, row });
    const existing = await prisma.shopeeIncome.findUnique({ where: { rawHash } });
    if (existing) {
      summary.rowsUpdated++;
      continue;
    }
    const order = await prisma.order.upsert({
      where: { marketplaceId: orderMarketplaceId },
      update: {
        createdAtOrder: orderCreatedAt,
        paidAt: date(get(row, "Data de conclusao do pagamento")),
        buyerUsername: String(get(row, "Nome de usuario (Comprador)") ?? ""),
        grossAmount: money(get(row, "Quantia paga pelo comprador")),
        carrier: String(get(row, "Transportadora") ?? "")
      },
      create: {
        marketplaceId: orderMarketplaceId,
        createdAtOrder: orderCreatedAt,
        paidAt: date(get(row, "Data de conclusao do pagamento")),
        buyerUsername: String(get(row, "Nome de usuario (Comprador)") ?? ""),
        grossAmount: money(get(row, "Quantia paga pelo comprador")),
        carrier: String(get(row, "Transportadora") ?? "")
      }
    });
    await prisma.salesInvoice.updateMany({
      where: { customerOrder: orderMarketplaceId, orderId: null },
      data: { orderId: order.id }
    });
    const incomeData = {
      orderMarketplaceId,
      sku: String(get(row, "SKU") ?? ""),
      productName: String(get(row, "Nome do produto") ?? ""),
      orderCreatedAt,
      paymentCompletedAt: date(get(row, "Data de conclusao do pagamento")),
      releasedAmount: money(get(row, "Quantia total lancada")),
      productPrice: money(get(row, "Preco do produto")),
      refundAmount: money(get(row, "Valor do Reembolso")),
      logisticsFreight: money(get(row, "Frete cobrado pelo parceiro logistico")),
      buyerShippingFee: money(get(row, "Taxa de frete paga pelo comprador")),
      shopeeShippingDiscount: money(get(row, "Desconto de frete pela Shopee")),
      reverseShippingFee: money(get(row, "Taxa de envio reverso")),
      sellerReturnFee: money(get(row, "Taxa de devolucao do vendedor")),
      commissionFee: money(get(row, "Taxa de comissao")),
      serviceFee: money(get(row, "Taxa de servico")),
      transactionFee: money(get(row, "Taxa de transacao")),
      affiliateCommissionFee: money(get(row, "Taxa de comissao Afiliados do Vendedor")),
      buyerPaidAmount: money(get(row, "Quantia paga pelo comprador")),
      carrier: String(get(row, "Transportadora", "Nome da Transportadora") ?? ""),
      buyerRefundedAmount: money(get(row, "Valor Reembolsado ao Comprador")),
      orderId: order.id
    };
    await prisma.shopeeIncome.create({
      data: {
        rawHash,
        ...incomeData
      }
    });
    for (const fee of ["Taxa de comissao", "Taxa de servico", "Taxa de transacao", "Taxa de comissao Afiliados do Vendedor"]) {
      if (!detectedFeeNames.has(fee)) {
        detectedFeeNames.add(fee);
        await detectFee("SHOPEE_INCOME", fee, summary);
      }
    }
    summary.rowsImported++;
  }
  Object.assign(summary, periodFromDates(dates));
}

async function detectFee(source: string, name: string, summary: ImportSummary) {
  if (!name.trim()) return;
  const existing = await prisma.detectedFee.findUnique({ where: { source_name: { source, name } } });
  await prisma.detectedFee.upsert({
    where: { source_name: { source, name } },
    update: { lastSeenAt: new Date() },
    create: { source, name }
  });
  if (!existing) summary.detectedFees.push(name);
}
