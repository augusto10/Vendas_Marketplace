"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";

type TopProductSales = {
  productName: string;
  sku: string;
  rows: number;
};

type ProductNameTickProps = {
  x?: number;
  y?: number;
  payload?: {
    value?: string | number;
  };
};

function shortLabel(value: string) {
  return value.length > 28 ? `${value.slice(0, 25)}...` : value;
}

function ProductNameTick({ x = 0, y = 0, payload }: ProductNameTickProps) {
  const value = String(payload?.value ?? "");

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={16} textAnchor="end" fill="hsl(var(--muted-foreground))" fontSize={12} transform="rotate(-20)">
        <title>{value}</title>
        {shortLabel(value)}
      </text>
    </g>
  );
}

export function TopProductsSalesChart({ data, className }: { data: TopProductSales[]; className?: string }) {
  const chartData = data.map((product) => ({
    name: product.productName,
    sku: product.sku,
    vendas: product.rows
  }));

  return (
    <div className={cn("h-80 w-full", className)}>
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 12, right: 24, bottom: 64, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={88} tick={<ProductNameTick />} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            formatter={(value) => [`${Number(value).toLocaleString("pt-BR")} vendas`, "Vendas"]}
            labelFormatter={(value) => String(value)}
          />
          <Legend iconType="circle" verticalAlign="bottom" height={28} />
          <Bar dataKey="vendas" name="Unidades vendidas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
