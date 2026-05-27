const XLSX = require("xlsx");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function normalizeRow(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
}

function hashRow(row) {
  return crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex");
}

function money(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const text = String(value).replace(/\s/g, "").replace("R$", "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function materializeRows(rawRows) {
  const scored = rawRows
    .map((row, index) => ({ index, filled: row.filter(Boolean).length }))
    .sort((a, b) => b.filled - a.filled)[0];
  const headerIndex = scored?.index ?? 0;
  const headers = rawRows[headerIndex].map((header) => String(header ?? "").trim());
  return rawRows
    .slice(headerIndex + 1)
    .map((row) => {
      const entry = {};
      headers.forEach((header, index) => {
        if (header) entry[header] = row[index];
      });
      return entry;
    })
    .filter((row) => Object.values(row).some((value) => value !== undefined && value !== null && value !== ""));
}

async function main() {
  const upload = await prisma.upload.findFirst({
    where: { type: "SHOPEE_INCOME" },
    orderBy: { createdAt: "desc" },
    select: { storagePath: true, originalName: true }
  });
  if (!upload?.storagePath) throw new Error("Upload Income nao encontrado");

  const workbook = XLSX.readFile(upload.storagePath, { cellDates: true });
  let updated = 0;
  let missing = 0;

  for (const sheet of workbook.SheetNames) {
    if (!/renda|income/i.test(sheet)) continue;
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1, defval: "" });
    const rows = materializeRows(rawRows);

    for (let index = 0; index < rows.length; index += 50) {
      const batch = rows.slice(index, index + 50);
      const results = await Promise.all(batch.map((original) => {
        const row = normalizeRow(original);
        const rawHash = hashRow({ sheet, row });
        return prisma.shopeeIncome.updateMany({
          where: { rawHash },
          data: {
            buyerShippingFee: money(row["TAXA DE FRETE PAGA PELO COMPRADOR"]),
            shopeeShippingDiscount: money(row["DESCONTO DE FRETE PELA SHOPEE"]),
            buyerPaidAmount: money(row["QUANTIA PAGA PELO COMPRADOR"]),
            buyerRefundedAmount: money(row["VALOR REEMBOLSADO AO COMPRADOR"])
          }
        });
      }));
      for (const result of results) {
        if (result.count) updated += result.count;
        else missing++;
      }
    }
  }

  console.log({ arquivo: upload.originalName, updated, missing });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
