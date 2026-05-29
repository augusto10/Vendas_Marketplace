import { CalendarDays } from "lucide-react";
import type { ReactNode } from "react";
import { DateInput } from "@/components/date-input";
import { FilterSubmitButton } from "@/components/filter-submit-button";
import { Label } from "@/components/ui/label";
import type { Period } from "@/lib/period";

export function PeriodFilter({ period, actionLabel = "Filtrar", children }: { period: Period; actionLabel?: string; children?: ReactNode }) {
  return (
    <form className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 shadow-[0_18px_42px_-34px_rgba(0,0,0,0.9)] md:flex-row md:items-end md:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight text-card-foreground">Periodo analisado</div>
          <div className="text-xs text-muted-foreground">{period.label}</div>
        </div>
      </div>
      <div className={children ? "grid gap-3 sm:grid-cols-[190px_150px_150px_auto]" : "grid gap-3 sm:grid-cols-[150px_150px_auto]"}>
        {children}
        <div className="space-y-1.5">
          <Label htmlFor="start">Inicio</Label>
          <DateInput id="start" name="start" defaultValue={period.query.start} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end">Fim</Label>
          <DateInput id="end" name="end" defaultValue={period.query.end} />
        </div>
        <FilterSubmitButton label={actionLabel} />
      </div>
    </form>
  );
}
