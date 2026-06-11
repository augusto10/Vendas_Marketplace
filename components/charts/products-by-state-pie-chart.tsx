"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

type ProductsByStateItem = {
  uf: string;
  produtos: number;
};

const COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#f59e0b",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#475569"
];

export function ProductsByStatePieChart({ data, className }: { data: ProductsByStateItem[]; className?: string }) {
  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="produtos"
            nameKey="uf"
            cx="50%"
            cy="43%"
            innerRadius={52}
            outerRadius={96}
            paddingAngle={2}
            stroke="hsl(var(--card))"
            strokeWidth={2}
          >
            {data.map((item, index) => (
              <Cell key={item.uf} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${Number(value).toLocaleString("pt-BR")} produto(s)`, "Produtos"]} />
          <Legend iconType="circle" verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
