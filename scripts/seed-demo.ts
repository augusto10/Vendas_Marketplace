import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.upload.findFirst({ where: { originalName: "demo-abril-2026.xlsx" } });
  if (existing) return;

  const upload = await prisma.upload.create({
    data: {
      type: "FISCAL_INVOICE",
      status: "COMPLETED",
      originalName: "demo-abril-2026.xlsx",
      checksum: "demo-abril-2026",
      rowsRead: 5,
      rowsImported: 5,
      periodStart: new Date("2026-04-01"),
      periodEnd: new Date("2026-04-12")
    }
  });

  const states = ["SP", "RJ", "MG", "RS", "BA"];
  for (let index = 0; index < 5; index++) {
    const date = new Date(`2026-04-${String(index + 1).padStart(2, "0")}`);
    const orderId = `DEMO2604${index}`;
    const total = 120 + index * 35;
    await prisma.order.upsert({
      where: { marketplaceId: orderId },
      update: {},
      create: { marketplaceId: orderId, createdAtOrder: date, paidAt: date, grossAmount: total, carrier: "Shopee Xpress" }
    });
    await prisma.salesInvoice.upsert({
      where: { documentNumber_emissionDate_branch: { documentNumber: `DEMO-${index}`, emissionDate: date, branch: "1" } },
      update: {},
      create: {
        documentNumber: `DEMO-${index}`,
        emissionDate: date,
        branch: "1",
        type: "V",
        customerOrder: orderId,
        quantity: index + 1,
        cfop: "6107",
        state: states[index],
        totalAmount: total,
        freightAmount: 12 + index,
        icmsRate: 12,
        taxableBase: total,
        icmsAmount: total * 0.12,
        estimatedDifal: total * 0.06
      }
    });
    await prisma.shopeeIncome.upsert({
      where: { rawHash: `demo-income-${index}` },
      update: {},
      create: {
        rawHash: `demo-income-${index}`,
        orderMarketplaceId: orderId,
        sku: `SKU-DEMO-${index}`,
        productName: `Produto demo ${index + 1}`,
        orderCreatedAt: date,
        paymentCompletedAt: date,
        releasedAmount: total * 0.82,
        productPrice: total,
        refundAmount: index === 2 ? 45 : 0,
        logisticsFreight: 9 + index,
        reverseShippingFee: index === 2 ? 8 : 0,
        sellerReturnFee: index === 2 ? 6 : 0,
        commissionFee: total * 0.12,
        serviceFee: total * 0.03,
        transactionFee: total * 0.015,
        affiliateCommissionFee: index % 2 ? 4 : 0,
        buyerPaidAmount: total,
        carrier: "Shopee Xpress",
        buyerRefundedAmount: index === 2 ? 45 : 0
      }
    });
  }

  await prisma.walletTransaction.createMany({
    data: [
      { rawHash: "demo-wallet-in", transactionDate: new Date("2026-04-10"), transactionType: "Shopee Acelera", description: "Entrada demo", orderMarketplaceId: "-", direction: "IN", amount: 950, status: "Transacao completa", balanceAfter: 950 },
      { rawHash: "demo-wallet-ads", transactionDate: new Date("2026-04-11"), transactionType: "Saldo da Carteira - Pagamento", description: "Recarga por compra de ADS", orderMarketplaceId: "-", direction: "OUT", amount: -100, status: "Transacao completa", balanceAfter: 850 }
    ],
    skipDuplicates: true
  });

  await prisma.acceleraTransaction.createMany({
    data: [
      { rawHash: "demo-acelera-1", rescueDate: new Date("2026-04-11"), rescueId: "DEMOACC1", orderMarketplaceId: "DEMO26040", rescuedAmount: 200, serviceFee: 5, receivedAmount: 195, status: "Totalmente pago", dueDate: new Date("2026-05-31") }
    ],
    skipDuplicates: true
  });

  await prisma.auditLog.create({ data: { action: "seed.demo", entity: "Upload", entityId: upload.id } });
}

main().finally(async () => prisma.$disconnect());
