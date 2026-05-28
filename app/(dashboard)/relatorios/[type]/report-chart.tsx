"use client";

import { useMemo, useState } from "react";

type ChartItem = {
  label: string;
  value: number;
};

export function ReportChart({ data, type }: { data: ChartItem[]; type: "bar" | "pie" }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const total = Math.max(data.reduce((sum, item) => sum + item.value, 0), 1);
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const selected = data[selectedIndex];
  const slices = useMemo(() => buildSlices(data, total), [data, total]);

  if (!data.length) {
    return <p className="text-sm text-muted-foreground">Sem dados para gerar grafico no periodo.</p>;
  }

  if (type === "pie") {
    return (
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <svg viewBox="-110 -110 220 220" className="mx-auto h-64 w-64" role="img" aria-label="Grafico de pizza">
          {slices.map((slice, index) => (
            <path
              key={`${slice.label}-${index}`}
              d={slice.path}
              fill={chartColor(index)}
              className="cursor-pointer transition-opacity hover:opacity-80"
              stroke={selectedIndex === index ? "#0f172a" : "#ffffff"}
              strokeWidth={selectedIndex === index ? 4 : 2}
              onClick={() => setSelectedIndex(index)}
            />
          ))}
        </svg>
        <div className="grid gap-3 content-center">
          {selected ? (
            <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
              <div className="text-xs font-semibold uppercase text-primary">Indice selecionado</div>
              <div className="mt-1 font-semibold text-slate-950">{selected.label}</div>
              <div className="text-slate-600">
                {selected.value.toLocaleString("pt-BR")} - {percent(selected.value, total)}
              </div>
            </div>
          ) : null}
          {data.map((item, index) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${selectedIndex === index ? "border-primary/40 bg-primary/10" : "bg-slate-50 hover:bg-slate-100"}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: chartColor(index) }} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 font-semibold">{percent(item.value, total)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[300px] grid-cols-[repeat(auto-fit,minmax(72px,1fr))] items-end gap-3">
      {data.map((item, index) => (
        <div key={item.label} className="flex min-h-[280px] flex-col justify-end gap-2">
          <div className="text-center text-xs font-semibold text-slate-900">{item.value.toLocaleString("pt-BR")}</div>
          <div className="mx-auto flex h-52 w-full max-w-[74px] items-end rounded-t-md bg-slate-100">
            <button
              type="button"
              aria-label={item.label}
              className="w-full rounded-t-md"
              style={{ height: `${Math.max(5, (item.value / maxValue) * 100)}%`, backgroundColor: chartColor(index) }}
              onClick={() => setSelectedIndex(index)}
            />
          </div>
          <div className="line-clamp-2 min-h-10 text-center text-xs text-slate-600" title={item.label}>
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function buildSlices(data: ChartItem[], total: number) {
  let startAngle = -90;
  return data.map((item) => {
    const angle = (item.value / total) * 360;
    const endAngle = startAngle + angle;
    const path = describeArc(0, 0, 96, startAngle, endAngle);
    const slice = { label: item.label, path };
    startAngle = endAngle;
    return slice;
  });
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [`M ${cx} ${cy}`, `L ${start.x} ${start.y}`, `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, "Z"].join(" ");
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  };
}

function percent(value: number, total: number) {
  return `${((value / total) * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function chartColor(index: number) {
  return ["#f59e0b", "#0f4c75", "#10b981", "#ef4444", "#6366f1", "#14b8a6", "#8b5cf6", "#f97316"][index % 8];
}
