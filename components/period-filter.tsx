import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import { FilterSubmitButton } from "@/components/filter-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Period } from "@/lib/period";

export function PeriodFilter({ period, actionLabel = "Filtrar", children }: { period: Period; actionLabel?: string; children?: ReactNode }) {
  return (
    <form className="flex flex-col gap-4 rounded-md border border-slate-200/80 bg-white p-4 shadow-[0_14px_30px_-28px_rgba(18,32,48,0.58)] md:flex-row md:items-end md:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-slate-950">Periodo analisado</div>
          <div className="text-xs text-slate-500">{period.label}</div>
        </div>
      </div>
      <div className={children ? "grid gap-3 sm:grid-cols-[190px_150px_150px_auto]" : "grid gap-3 sm:grid-cols-[150px_150px_auto]"}>
        {children}
        <div className="space-y-1.5">
          <Label htmlFor="start">Inicio</Label>
          <Input id="start" name="start" type="date" defaultValue={period.query.start} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end">Fim</Label>
          <Input id="end" name="end" type="date" defaultValue={period.query.end} />
        </div>
        <FilterSubmitButton label={actionLabel} />
      </div>
    </form>
  );
}
