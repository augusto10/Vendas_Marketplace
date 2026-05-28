import Link from "next/link";
import { BarChart3, FileSpreadsheet, Eye, FileText, Printer } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parsePeriod } from "@/lib/period";
import { REPORT_CATALOG } from "@/lib/services/report-export-service";

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const query = `start=${period.query.start}&end=${period.query.end}`;
  const filtered = Boolean(params.start || params.end);

  return (
    <div className="space-y-6">
      <PageHeader title="Central de relatorios" description="Visualize, imprima e baixe relatorios por area da operacao." />
      <PeriodFilter period={period} />
      {filtered ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          Relatorios gerados com sucesso.
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_CATALOG.map((report) => (
          <Card key={report.type} className="metric-card overflow-hidden">
            <CardHeader className="border-b bg-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>{report.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                </div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/relatorios/${report.type}?${query}`}>
                    <Eye className="h-4 w-4" />
                    Visualizar
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/relatorios/${report.type}?${query}&print=1`} target="_blank">
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/relatorios/${report.type}?${query}&mode=pdf`}>
                    <FileText className="h-4 w-4" />
                    PDF
                  </Link>
                </Button>
                <Button asChild className="w-full">
                  <Link href={`/relatorios/${report.type}?${query}&mode=excel`}>
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
