"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

export function TopProductsSalesChart({ data }: { data: TopProductSales[] }) {
  const chartData = data.map((product) => ({
    name: product.productName,
    sku: product.sku,
    vendas: product.rows
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={chartData} margin={{ top: 8, right: 24, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} height={70} tick={<ProductNameTick />} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={48} />
          <Tooltip
            formatter={(value) => [`${Number(value).toLocaleString("pt-BR")} vendas`, "Vendas"]}
            labelFormatter={(value) => String(value)}
          />
          <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
