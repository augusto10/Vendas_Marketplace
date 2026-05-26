"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { currency } from "@/lib/utils";

export function MonthlySalesChart({ data }: { data: Array<{ month: string; vendas: number; unidades: number; frete: number }> }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(value) => currency(value).replace("R$", "")} tickLine={false} axisLine={false} width={70} />
          <Tooltip formatter={(value) => currency(Number(value))} />
          <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
