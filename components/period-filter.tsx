import { CalendarDays, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Period } from "@/lib/period";

export function PeriodFilter({ period, actionLabel = "Filtrar" }: { period: Period; actionLabel?: string }) {
  return (
    <form className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm md:flex-row md:items-end md:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-medium">Periodo analisado</div>
          <div className="text-xs text-muted-foreground">{period.label}</div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[150px_150px_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="start">Inicio</Label>
          <Input id="start" name="start" type="date" defaultValue={period.query.start} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="end">Fim</Label>
          <Input id="end" name="end" type="date" defaultValue={period.query.end} />
        </div>
        <Button type="submit" className="self-end">
          <Filter className="h-4 w-4" />
          {actionLabel}
        </Button>
      </div>
    </form>
  );
}
