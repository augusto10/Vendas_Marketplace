import Link from "next/link";
import { FileSpreadsheet, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { getReportData } from "@/lib/services/report-export-service";
import { PrintButton, PrintOnLoad } from "./print-on-load";
import { ReportChart } from "./report-chart";

export const dynamic = "force-dynamic";

export default async function ReportPreviewPage({
  params,
  searchParams
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ start?: string; end?: string; print?: string; chart?: string; mode?: string }>;
}) {
  const routeParams = await params;
  const queryParams = await searchParams;
  const period = parsePeriod(queryParams);
  const report = await getReportData(routeParams.type, period);
  const query = `type=${report.type}&start=${period.query.start}&end=${period.query.end}`;
  const pageQuery = `start=${period.query.start}&end=${period.query.end}${queryParams.mode ? `&mode=${queryParams.mode}` : ""}`;
  const chartType = queryParams.chart === "pie" ? "pie" : "bar";
  const previewRows = report.rows.slice(0, 120);
  const modeLabel = queryParams.mode === "pdf" ? "Formato para PDF" : queryParams.mode === "excel" ? "Formato para Excel" : "Visualizacao";

  return (
    <div className="space-y-5 print:bg-white">
      <PrintOnLoad enabled={queryParams.print === "1"} />
      <div className="print:hidden">
        <PageHeader title={report.title} description={`${modeLabel}. ${report.description} Periodo: ${period.label}.`}>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/relatorios">Voltar</Link>
            </Button>
            <Button asChild variant="outline">
              <a href={`/api/v1/reports?${query}&format=pdf`}>
                <FileText className="h-4 w-4" />
                Baixar PDF
              </a>
            </Button>
            <Button asChild>
              <a href={`/api/v1/reports?${query}&format=xlsx`}>
                <FileSpreadsheet className="h-4 w-4" />
                Baixar Excel
              </a>
            </Button>
            <PrintButton />
          </div>
        </PageHeader>
      </div>

      <div className="hidden print:block">
        <h1 className="text-2xl font-semibold">{report.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{report.description} Periodo: {period.label}.</p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader className="border-b bg-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Grafico do relatorio</CardTitle>
              <div className="flex rounded-md border bg-slate-50 p-1 print:hidden">
                <Button asChild size="sm" variant={chartType === "bar" ? "default" : "ghost"}>
                  <Link href={`/relatorios/${report.type}?${pageQuery}&chart=bar`}>Barras</Link>
                </Button>
                <Button asChild size="sm" variant={chartType === "pie" ? "default" : "ghost"}>
                  <Link href={`/relatorios/${report.type}?${pageQuery}&chart=pie`}>Pizza</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ReportChart data={report.chart} type={chartType} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b bg-white">
          <CardTitle>Dados do relatorio</CardTitle>
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
