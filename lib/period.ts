import { endOfDay, format, parseISO, startOfDay } from "date-fns";

export type Period = {
  start: Date;
  end: Date;
  label: string;
  query: {
    start: string;
    end: string;
  };
};

export function parsePeriod(params?: { start?: string; end?: string; preset?: string }): Period {
  const today = new Date();
  const preset = params?.preset ?? "month";
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const fallbackStart = preset === "all" ? new Date(2024, 0, 1) : monthStart;
  const start = params?.start ? parseISO(params.start) : fallbackStart;
  const end = params?.end ? parseISO(params.end) : today;

  const normalizedStart = startOfDay(Number.isNaN(start.getTime()) ? fallbackStart : start);
  const normalizedEnd = endOfDay(Number.isNaN(end.getTime()) ? today : end);

  return {
    start: normalizedStart,
    end: normalizedEnd,
    label: `${format(normalizedStart, "dd/MM/yyyy")} a ${format(normalizedEnd, "dd/MM/yyyy")}`,
    query: {
      start: format(normalizedStart, "yyyy-MM-dd"),
      end: format(normalizedEnd, "yyyy-MM-dd")
    }
  };
}

export function periodWhere(field: string, period: Period) {
  return {
    [field]: {
      gte: period.start,
      lte: period.end
    }
  };
}
