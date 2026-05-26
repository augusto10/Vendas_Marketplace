import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ParsedSheet } from "@/types/imports";
import { normalizeHeader } from "@/lib/importers/normalizers";

const knownHeaders = [
  "EMISSAO",
  "DOCTO/SER",
  "CFOP",
  "VR TOTAL",
  "DATA",
  "TIPO DE TRANSACAO",
  "ID DO PEDIDO",
  "DIRECAO DO DINHEIRO",
  "DATA DO RESGATE RAPIDO",
  "ID DO RESGATE RAPIDO",
  "TAXA DE SERVICO",
  "VALOR RECEBIDO",
  "SKU",
  "QUANTIA TOTAL LANCADA",
  "PRECO DO PRODUTO"
];

function headerScore(row: unknown[]) {
  const normalized = new Set(row.map(normalizeHeader));
  return knownHeaders.filter((header) => normalized.has(header)).length;
}

function materializeRows(rawRows: unknown[][]): Record<string, unknown>[] {
  const scoredRows = rawRows.map((row, index) => ({ index, score: headerScore(row), filled: row.filter(Boolean).length }));
  const best = scoredRows.sort((a, b) => b.score - a.score || b.filled - a.filled)[0];
  const headerIndex = best && best.score >= 2 ? best.index : rawRows.findIndex((row) => row.filter(Boolean).length >= 3);
  if (headerIndex < 0) return [];
  const headers = rawRows[headerIndex].map((header) => String(header ?? "").trim());
  return rawRows.slice(headerIndex + 1).map((row) => {
    const entry: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) entry[header] = row[index];
    });
    return entry;
  }).filter((row) => Object.values(row).some((value) => value !== undefined && value !== null && value !== ""));
}

export async function parseFile(file: File): Promise<ParsedSheet[]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    let text = new TextDecoder("utf-8").decode(buffer);
    if (text.includes("�")) text = new TextDecoder("latin1").decode(buffer);
    const parsed = Papa.parse<string[]>(text, { delimitersToGuess: [";", ",", "\t"], skipEmptyLines: true });
    const rows = materializeRows(parsed.data as unknown[][]);
    return [{ name: "CSV", rows, headers: Object.keys(rows[0] ?? {}).map(normalizeHeader) }];
  }

  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    const rows = materializeRows(rawRows);
    return { name, rows, headers: Object.keys(rows[0] ?? {}).map(normalizeHeader) };
  });
}
