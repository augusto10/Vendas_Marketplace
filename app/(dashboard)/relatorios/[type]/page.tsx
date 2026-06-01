import Link from "next/link";
import { ArrowLeft, CalendarDays, FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PeriodFilter } from "@/components/period-filter";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getReportData, getReportViewOptions, type ReportView } from "@/lib/services/report-export-service";

export const dynamic = "force-dynamic";

export default async function ReportPreviewPage({
  params,
  searchParams
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ start?: string; end?: string; view?: string }>;
}) {
  const routeParams = await params;
  const queryParams = await searchParams;
  const period = parsePeriod(queryParams);
  const selectedView = normalizeReportView(queryParams.view);
  const report = await getReportData(routeParams.type, period, selectedView);
  const viewOptions = getReportViewOptions(report.type);
  const activeView = viewOptions.find((option) => option.value === selectedView) ?? viewOptions[0];
  const query = `type=${report.type}&start=${period.query.start}&end=${period.query.end}&view=${selectedView}`;
  const previewRows = report.rows.slice(0, 120);
  const columnTotals = getColumnTotals(report.rows);
  const presetLinks = buildPresetLinks(report.type, selectedView);

  return (
    <div className="space-y-5 print:bg-white">
      <div className="print:hidden">
        <PageHeader title={report.title} description={report.description}>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/relatorios">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        </PageHeader>
      </div>

      <Card className="print:hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Configurar relatorio</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Escolha o modelo, periodo e gere o arquivo.</p>
            </div>
            <Badge className="border-primary/20 bg-primary/10 text-primary">{activeView.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <PeriodFilter period={period} actionLabel="Aplicar periodo">
            <div className="space-y-1.5">
              <label htmlFor="view" className="text-sm font-medium leading-none">Modelo</label>
              <select id="view" name="view" defaultValue={selectedView} className="form-select">
                {viewOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </PeriodFilter>

          <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarDays className="h-4 w-4 text-primary" />
                Periodos rapidos
              </div>
              <div className="flex flex-wrap gap-2">
                {presetLinks.map((preset) => (
                  <Button key={preset.label} asChild size="sm" variant={preset.active(period.query.start, period.query.end) ? "default" : "outline"}>
                    <Link href={preset.href}>{preset.label}</Link>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 xl:min-w-[360px]">
              <div className="text-sm font-semibold">Gerar arquivo</div>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <a href={`/api/v1/reports?${query}&format=pdf`}>
                    <FileText className="h-4 w-4" />
                    PDF
                  </a>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <a href={`/api/v1/reports?${query}&format=xlsx`}>
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </a>
                </Button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">{activeView.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="hidden print:block">
        <h1 className="text-2xl font-semibold">{report.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{report.description} Periodo: {period.label}.</p>
      </div>

      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle>Previa do relatorio</CardTitle>
          <p className="text-sm text-muted-foreground">{activeView.label}. Periodo: {period.label}.</p>
          {report.totalRows > previewRows.length ? (
            <p className="text-sm text-muted-foreground">Visualizando as primeiras {previewRows.length} linhas. Baixe o Excel para ver tudo.</p>
          ) : null}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {report.header.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {report.header.map((column, columnIndex) => (
                    <TableCell key={`${column}-${columnIndex}`}>{formatCell(row[columnIndex])}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            {columnTotals.some((total) => total !== null) ? (
              <TableFooter>
                <TableRow>
                  {report.header.map((column, columnIndex) => (
                    <TableCell key={`${column}-total`} className="sticky bottom-0 bg-muted font-semibold">
                      {columnIndex === 0 ? "Total" : formatTotal(columnTotals[columnIndex])}
                    </TableCell>
                  ))}
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (value instanceof Date) return value.toLocaleDateString("pt-BR");
  return String(value);
}

function getColumnTotals(rows: Array<Array<unknown>>): Array<number | null> {
  if (!rows.length) return [];
  return Array.from({ length: rows[0].length }, (_, columnIndex) => {
    const values = rows.map((row) => row[columnIndex]).filter((value) => value !== null && value !== undefined && value !== "");
    if (!values.length || !values.every(isNumericValue)) return null;
    return values.reduce<number>((sum, value) => sum + numericValue(value), 0);
  });
}

function isNumericValue(value: unknown): value is number | { toNumber: () => number } {
  return typeof value === "number" || (typeof value === "object" && value !== null && !(value instanceof Date) && "toNumber" in value);
}

function numericValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const decimalValue = value as { toNumber?: () => number };
    if (typeof decimalValue.toNumber === "function") return decimalValue.toNumber();
  }
  return 0;
}

function formatTotal(value: number | null) {
  return value === null ? "" : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function normalizeReportView(value: string | undefined): ReportView {
  return value === "daily" || value === "cumulative" ? value : "detail";
}

function buildPresetLinks(type: string, view: ReportView) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
  const last30Start = new Date(today);
  last30Start.setDate(today.getDate() - 29);
  const presets = [
    { label: "Hoje", start: today, end: today },
    { label: "Este mes", start: monthStart, end: today },
    { label: "Mes passado", start: previousMonthStart, end: previousMonthEnd },
    { label: "Ultimos 30 dias", start: last30Start, end: today }
  ];

  return presets.map((preset) => {
    const start = formatDateInput(preset.start);
    const end = formatDateInput(preset.end);
    return {
      label: preset.label,
      href: `/relatorios/${type}?start=${start}&end=${end}&view=${view}`,
      active: (currentStart: string, currentEnd: string) => currentStart === start && currentEnd === end
    };
  });
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
