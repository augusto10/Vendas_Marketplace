import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function currency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

export function signedCurrency(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  const formatted = currency(Math.abs(amount));
  if (amount > 0) return `+ ${formatted}`;
  if (amount < 0) return `- ${formatted}`;
  return formatted;
}

export function moneyToneClass(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  if (amount > 0) return "text-emerald-300";
  if (amount < 0) return "text-red-300";
  return "text-muted-foreground";
}

export function percent(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
