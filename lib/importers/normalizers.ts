import { createHash } from "crypto";
import { parse, parseISO, isValid } from "date-fns";

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function normalizeRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
}

export function money(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return value;
  const text = String(value)
    .replace(/\s/g, "")
    .replace("R$", "");
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  const raw = normalized.replace(/[^\d.-]/g, "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function int(value: unknown): number {
  const parsed = Number(String(value ?? "0").replace(/[^\d-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function date(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date && isValid(value)) return value;
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + value * 86400000);
  }
  const text = String(value).trim();
  const candidates = [
    parse(text, "dd/MM/yyyy", new Date()),
    parse(text, "dd/MM/yyyy HH:mm:ss", new Date()),
    parse(text, "dd.MM.yyyy", new Date()),
    parse(text, "dd.MM.yyyy HH:mm:ss", new Date()),
    parse(text, "yyyy-MM-dd", new Date()),
    parse(text, "yyyy-MM-dd HH:mm:ss", new Date()),
    parseISO(text)
  ];
  return candidates.find((candidate) => isValid(candidate)) ?? null;
}

export function hashRow(row: unknown) {
  return createHash("sha256").update(JSON.stringify(row)).digest("hex");
}

export function get(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);
    const directValue = row[normalizedKey];
    if (directValue !== undefined && directValue !== null && directValue !== "") return directValue;
    const matchedKey = Object.keys(row).find((rowKey) => {
      const normalizedRowKey = normalizeHeader(rowKey);
      return normalizedRowKey.startsWith(`${normalizedKey} `) || normalizedRowKey.startsWith(`${normalizedKey}(`);
    });
    const value = matchedKey ? row[matchedKey] : undefined;
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}
