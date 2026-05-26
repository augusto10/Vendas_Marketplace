import type { UploadType } from "@prisma/client";
import type { ParsedSheet } from "@/types/imports";
import { normalizeHeader } from "@/lib/importers/normalizers";

export const uploadSignatures: Array<{ type: UploadType; columns: string[]; sheet?: RegExp }> = [
  { type: "FISCAL_INVOICE", columns: ["EMISSAO", "DOCTO/SER", "CFOP", "VR TOTAL", "VR ICMS"] },
  { type: "SHOPEE_WALLET", columns: ["DATA", "TIPO DE TRANSACAO", "ID DO PEDIDO", "DIRECAO DO DINHEIRO", "VALOR"] },
  { type: "SHOPEE_ACCELERA", columns: ["DATA DO RESGATE RAPIDO", "ID DO RESGATE RAPIDO", "TAXA DE SERVICO", "VALOR RECEBIDO"] },
  { type: "SHOPEE_INCOME", columns: ["ID DO PEDIDO", "SKU", "QUANTIA TOTAL LANCADA"], sheet: /renda|income/i }
];

export function detectUploadType(sheets: ParsedSheet[]): UploadType {
  let best: { type: UploadType; score: number } = { type: "UNKNOWN", score: 0 };
  for (const signature of uploadSignatures) {
    for (const sheet of sheets) {
      const headers = sheet.headers.map(normalizeHeader);
      const sheetMatches = !signature.sheet || signature.sheet.test(sheet.name);
      const columnMatches = signature.columns.filter((column) => {
        const normalizedColumn = normalizeHeader(column);
        const allowSuffix = normalizedColumn.length > 5;
        return headers.some(
          (header) =>
            header === normalizedColumn ||
            (allowSuffix && (header.startsWith(`${normalizedColumn} `) || header.startsWith(`${normalizedColumn}(`)))
        );
      }).length;
      const score = columnMatches + (sheetMatches ? 0.5 : -10);
      if (score > best.score) best = { type: signature.type, score };
    }
  }
  return best.score >= 3 ? best.type : "UNKNOWN";
}

export function validateRequiredColumns(type: UploadType, sheets: ParsedSheet[]) {
  const signature = uploadSignatures.find((item) => item.type === type);
  if (!signature) return { required: [], present: [], missing: [] };

  const headers = sheets.flatMap((sheet) => sheet.headers.map(normalizeHeader));
  const present = signature.columns.filter((column) => {
    const normalizedColumn = normalizeHeader(column);
    return headers.some((header) => header === normalizedColumn || header.startsWith(`${normalizedColumn} `) || header.startsWith(`${normalizedColumn}(`));
  });
  return {
    required: signature.columns,
    present,
    missing: signature.columns.filter((column) => !present.includes(column))
  };
}
