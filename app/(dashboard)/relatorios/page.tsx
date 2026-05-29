import Link from "next/link";
import { ArrowRight, BarChart3, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { REPORT_CATALOG, type ReportType } from "@/lib/services/report-export-service";

type ReportCategory = "operacao" | "financeiro" | "fiscal" | "admin";

const categoryLabels: Record<ReportCategory, string> = {
  operacao: "Operacao",
  financeiro: "Financeiro",
  fiscal: "Fiscal",
  admin: "Administracao"
};

const reportCategories: Record<ReportType, ReportCategory> = {
  sales: "operacao",
  orders: "operacao",
  products: "operacao",
  commissions: "financeiro",
  fees: "financeiro",
  returns: "operacao",
  freight: "operacao",
  fiscal: "fiscal",
  financial: "financeiro",
  wallet: "financeiro",
  accelera: "financeiro",
  uploads: "admin"
};

export default async function RelatoriosPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const selectedCategory = isReportCategory(params.category) ? params.category : "todos";
  const reports = REPORT_CATALOG.filter((report) => {
    const category = reportCategories[report.type];
    const matchesCategory = selectedCategory === "todos" || category === selectedCategory;
    const text = `${report.title} ${report.description} ${categoryLabels[category]}`.toLowerCase();
    return matchesCategory && (!query || text.includes(query));
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Central de relatorios" description="Escolha um relatorio, configure periodo e formato na proxima etapa." />

      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle>Biblioteca de relatorios</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{reports.length} relatorio(s) disponiveis</p>
            </div>
            <form className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px_auto]" action="/relatorios">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input name="q" defaultValue={params.q ?? ""} placeholder="Buscar relatorio" className="pl-9" />
              </div>
              <select name="category" defaultValue={selectedCategory} className="form-select">
                <option value="todos">Todas as areas</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <Button type="submit" variant="outline">
                <SlidersHorizontal className="h-4 w-4" />
                Filtrar
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Relatorio</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Conteudo</TableHead>
                <TableHead>Arquivos</TableHead>
                <TableHead className="text-right">Acao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const category = reportCategories[report.type];
                return (
                  <TableRow key={report.type}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{report.title}</div>
                          <div className="text-xs text-muted-foreground">{report.fileName}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "border-primary/20 bg-primary/10 text-primary",
                        category === "financeiro" && "border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
                        category === "fiscal" && "border-sky-500/25 bg-sky-500/15 text-sky-300",
                        category === "admin" && "border-violet-500/25 bg-violet-500/15 text-violet-300"
                      )}>
                        {categoryLabels[category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[520px] whitespace-normal text-muted-foreground">{report.description}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        <span className="rounded-md border bg-muted/30 px-2 py-1">PDF</span>
                        <span className="rounded-md border bg-muted/30 px-2 py-1">Excel</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm">
                        <Link href={`/relatorios/${report.type}`}>
                          Configurar
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!reports.length ? (
            <div className="rounded-md border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
              Nenhum relatorio encontrado para os filtros informados.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function isReportCategory(value: unknown): value is ReportCategory {
  return value === "operacao" || value === "financeiro" || value === "fiscal" || value === "admin";
}
