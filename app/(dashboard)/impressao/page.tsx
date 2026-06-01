import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { currency } from "@/lib/utils";
import { getDashboardMetrics, getStateRanking } from "@/lib/services/dashboard-service";
import type { SalesConciliationDateMode } from "@/lib/services/report-service";
import { getReportData, type ReportData, type ReportType } from "@/lib/services/report-export-service";
import { PrintButton } from "./print-on-load";

export const dynamic = "force-dynamic";

type PrintableSection = {
  type: "overview" | ReportType;
  title: string;
  description: string;
};

const PRINTABLE_SECTIONS: PrintableSection[] = [
  { type: "overview", title: "Visao geral", description: "Indicadores consolidados do periodo." },
  { type: "sales", title: "Vendas", description: "Notas, pedidos, impostos e valores emitidos." },
  { type: "orders", title: "Pedidos", description: "Pedidos importados, status e valores principais." },
  { type: "products", title: "Produtos", description: "Produtos por receita, comissao e devolucoes." },
  { type: "fees", title: "Taxas", description: "Taxas classificadas por tipo." },
  { type: "returns", title: "Devolucoes", description: "Reembolsos e valores devolvidos." },
  { type: "freight", title: "Fretes", description: "Fretes, transportadoras e diferencas." },
  { type: "fiscal", title: "Fiscal", description: "Notas, UF, base, ICMS e DIFAL." },
  { type: "financial", title: "Financeiro", description: "Recebimentos e movimentacoes financeiras." },
  { type: "wallet", title: "Carteira Shopee", description: "Entradas, saidas, ajustes e saldos." },
  { type: "accelera", title: "Acelera", description: "Antecipacoes, taxas e vencimentos." },
  { type: "uploads", title: "Historico de uploads", description: "Arquivos processados e resultado das importacoes." }
];

export default async function PrintableReportPage({
  searchParams
}: {
  searchParams: Promise<{ start?: string; end?: string; dateMode?: string; sections?: string | string[] }>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const dateMode = normalizeDateMode(params.dateMode);
  const selectedSections = normalizeSections(params.sections);
  const selectedSet = new Set(selectedSections);
  const reports = await Promise.all(
    selectedSections
      .filter((section): section is ReportType => section !== "overview")
      .map((section) => getReportData(section, period, "detail"))
  );

  const [metrics, states] = selectedSet.has("overview")
    ? await Promise.all([getDashboardMetrics(period, dateMode), getStateRanking(period, dateMode)])
    : [null, [] as Awaited<ReturnType<typeof getStateRanking>>];

  return (
    <div className="mx-auto max-w-6xl space-y-6 bg-white p-6 text-slate-950 print:max-w-none print:p-0">
      <div className="flex flex-col gap-3 rounded-md border bg-white p-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Relatorio pronto para imprimir</h1>
          <p className="text-sm text-slate-600">Revise o relatorio e clique em imprimir quando quiser gerar o PDF ou mandar para a impressora.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard?start=${period.query.start}&end=${period.query.end}`}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <PrintButton />
        </div>
      </div>

      <header className="border-b border-slate-300 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Relatorio consolidado</p>
        <h1 className="mt-2 text-3xl font-semibold">Vendas Marketplace</h1>
        <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <div><span className="font-semibold text-slate-900">Periodo:</span> {period.label}</div>
          <div><span className="font-semibold text-slate-900">Secoes:</span> {selectedSections.length}</div>
          <div><span className="font-semibold text-slate-900">Gerado em:</span> {new Date().toLocaleString("pt-BR")}</div>
        </div>
      </header>

      {metrics ? <OverviewSection metrics={metrics} states={states} periodLabel={period.label} /> : null}
      {reports.map((report) => <ReportSection key={report.type} report={report} />)}
    </div>
  );
}

function OverviewSection({
  metrics,
  states,
  periodLabel
}: {
  metrics: Awaited<ReturnType<typeof getDashboardMetrics>>;
  states: Awaited<ReturnType<typeof getStateRanking>>;
  periodLabel: string;
}) {
  const cards = [
    ["Vendas ERP", currency(metrics.soldAmount), `${metrics.orders.toLocaleString("pt-BR")} pedidos`],
    ["Vendas Shopee", currency(metrics.shopeeSoldAmount), `${metrics.paidOrders.toLocaleString("pt-BR")} pedidos pagos`],
    ["Recebido", currency(metrics.receivedAmount), `${metrics.paidUnitsSold.toLocaleString("pt-BR")} unidades pagas`],
    ["Taxas totais", currency(metrics.fees), `Comissao ${currency(metrics.commission)}`],
    ["Frete", currency(metrics.freight), `Devolucoes ${currency(metrics.refunds)}`],
    ["DIFAL estimado", currency(metrics.difal), `ICMS ${currency(metrics.icms)}`]
  ];

  return (
    <section className="break-after-page space-y-4">
      <SectionTitle title="Visao geral" description={`Indicadores principais do periodo ${periodLabel}.`} />
      <InfoTable
        header={["Indicador", "Valor", "Observacao"]}
        rows={cards.map(([title, value, detail]) => [title, value, detail])}
      />
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase text-slate-600">Ranking por UF</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>UF</TableHead>
              <TableHead>Pedidos</TableHead>
              <TableHead>Vendas</TableHead>
              <TableHead>DIFAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {states.map((state) => (
              <TableRow key={state.uf}>
                <TableCell className="font-semibold">{state.uf}</TableCell>
                <TableCell>{state.pedidos.toLocaleString("pt-BR")}</TableCell>
                <TableCell>{currency(state.vendas)}</TableCell>
                <TableCell>{currency(state.difal)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function ReportSection({ report }: { report: ReportData }) {
  const summaryRows = getReportSummaryRows(report);
  const highlights = getReportHighlights(report);

  return (
    <section className="break-after-page space-y-4">
      <SectionTitle title={report.title} description={report.description} />
      <InfoTable
        header={["Resumo", "Valor"]}
        rows={summaryRows}
      />

      {highlights.rows.length ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase text-slate-600">Destaques</h3>
          <InfoTable
            header={highlights.header}
            rows={highlights.rows}
          />
        </div>
      ) : (
        <p className="text-sm text-slate-600">Sem valores consolidados para esta secao no periodo.</p>
      )}
    </section>
  );
}

function getReportSummaryRows(report: ReportData) {
  const sum = (column: string) => sumColumn(report, column);
  const count = report.totalRows.toLocaleString("pt-BR");

  switch (report.type) {
    case "sales":
      return [
        ["Notas emitidas", count],
        ["Vendas totais", currency(sum("valor_total"))],
        ["Unidades vendidas", sum("qtde").toLocaleString("pt-BR")],
        ["ICMS", currency(sum("icms"))],
        ["DIFAL", currency(sum("difal"))]
      ];
    case "orders":
      return [
        ["Pedidos", count],
        ["Valor bruto", currency(sum("bruto"))],
        ["Valor liquido", currency(sum("liquido"))],
        ["Pagos", countRows(report, "status", "Pago").toLocaleString("pt-BR")],
        ["Pendentes", countRows(report, "status", "Pendente").toLocaleString("pt-BR")]
      ];
    case "products":
      return [
        ["Produtos/SKUs", count],
        ["Receita", currency(sum("receita"))],
        ["Comissao", currency(sum("comissao"))],
        ["Devolucoes", currency(sum("devolucoes"))]
      ];
    case "fees":
      return [
        ["Tipos de taxa", count],
        ["Total de taxas", currency(sum("valor"))]
      ];
    case "returns":
      return [
        ["Itens com devolucao", count],
        ["Reembolso", currency(sum("reembolso"))],
        ["Reembolsado ao comprador", currency(sum("reembolsado_comprador"))]
      ];
    case "freight":
      return [
        ["Pedidos/itens", count],
        ["Frete pago Shopee", currency(sum("frete_pago_shopee"))],
        ["Frete comprador", currency(sum("frete_comprador"))],
        ["Frete logistico", currency(sum("frete_logistico"))],
        ["Diferenca", currency(sum("diferenca"))],
        ["Envio reverso", currency(sum("envio_reverso"))]
      ];
    case "fiscal":
      return [
        ["Notas fiscais", count],
        ["Valor total", currency(sum("valor_total"))],
        ["Base fiscal", currency(sum("base"))],
        ["ICMS", currency(sum("icms"))],
        ["DIFAL", currency(sum("difal"))]
      ];
    case "financial":
      return getFinancialSummaryRows(report);
    case "wallet":
      return [
        ["Movimentacoes", count],
        ["Entradas", currency(sumByDirection(report, "IN"))],
        ["Saidas", currency(sumByDirection(report, "OUT"))],
        ["Saldo final informado", currency(lastNumericValue(report, "saldo"))]
      ];
    case "accelera":
      return [
        ["Antecipacoes", count],
        ["Valor resgatado", currency(sum("resgatado"))],
        ["Taxa de servico", currency(sum("taxa"))],
        ["Valor recebido", currency(sum("recebido"))],
        ["Reembolsado", currency(sum("reembolsado"))]
      ];
    case "uploads":
      return [
        ["Arquivos", count],
        ["Linhas lidas", sum("lidas").toLocaleString("pt-BR")],
        ["Importadas", sum("importadas").toLocaleString("pt-BR")],
        ["Atualizadas", sum("atualizadas").toLocaleString("pt-BR")],
        ["Erros", sum("erros").toLocaleString("pt-BR")]
      ];
    default:
      return [["Registros", count]];
  }
}

function getReportHighlights(report: ReportData) {
  if (report.type === "products") {
    return { header: ["Item", "Valor"], rows: topRowsByColumn(report, "receita", "produto", 5) };
  }
  if (report.type === "fees") {
    return { header: ["Item", "Valor"], rows: topRowsByColumn(report, "valor", "tipo", 5) };
  }
  if (report.type === "fiscal" || report.type === "sales") {
    return { header: ["Item", "Valor"], rows: topRowsByColumn(report, "valor_total", "uf", 5, true) };
  }
  if (report.type === "wallet") {
    return { header: ["Destaque", "Data", "Tipo", "Valor"], rows: getWalletHighlights(report) };
  }
  if (report.type === "financial") {
    return { header: ["Origem", "Entradas", "Saidas", "Saldo"], rows: getFinancialHighlights(report) };
  }
  return {
    header: ["Item", "Valor"],
    rows: [...report.chart]
      .sort((left, right) => right.value - left.value)
      .slice(0, 5)
      .map((row) => [row.label, currency(row.value)])
  };
}

function sumColumn(report: ReportData, column: string) {
  const index = report.header.indexOf(column);
  if (index < 0) return 0;
  return report.rows.reduce((sum, row) => sum + numericValue(row[index]), 0);
}

function countRows(report: ReportData, column: string, value: string) {
  const index = report.header.indexOf(column);
  if (index < 0) return 0;
  return report.rows.filter((row) => String(row[index] ?? "") === value).length;
}

function getFinancialSummaryRows(report: ReportData) {
  const walletIn = sumFinancialOrigin(report, "carteira", "IN");
  const walletOut = sumFinancialOrigin(report, "carteira", "OUT");
  const acceleraIn = sumFinancialOrigin(report, "acelera", "IN");
  const incomeIn = sumFinancialOrigin(report, "income", "IN");

  return [
    ["Movimentacoes", report.totalRows.toLocaleString("pt-BR")],
    ["Carteira - entradas", currency(walletIn)],
    ["Carteira - saidas", currency(walletOut)],
    ["Acelera recebido", currency(acceleraIn)],
    ["Income liberado", currency(incomeIn)],
    ["Saldo consolidado", currency(walletIn + acceleraIn + incomeIn - walletOut)]
  ];
}

function getFinancialHighlights(report: ReportData) {
  const origins = ["carteira", "acelera", "income"];
  return origins
    .map((origin) => {
      const incoming = sumFinancialOrigin(report, origin, "IN");
      const outgoing = sumFinancialOrigin(report, origin, "OUT");
      if (!incoming && !outgoing) return null;
      return [formatOrigin(origin), currency(incoming), currency(outgoing), currency(incoming - outgoing)];
    })
    .filter((row): row is string[] => Boolean(row));
}

function sumFinancialOrigin(report: ReportData, origin: string, direction: "IN" | "OUT") {
  const originIndex = report.header.indexOf("origem");
  const directionIndex = report.header.indexOf("direcao");
  const valueIndex = report.header.indexOf("valor");
  if (originIndex < 0 || directionIndex < 0 || valueIndex < 0) return 0;
  return report.rows
    .filter((row) => String(row[originIndex] ?? "") === origin)
    .filter((row) => String(row[directionIndex] ?? "").toUpperCase() === direction)
    .reduce((sum, row) => sum + Math.abs(numericValue(row[valueIndex])), 0);
}

function formatOrigin(origin: string) {
  if (origin === "carteira") return "Carteira Shopee";
  if (origin === "acelera") return "Acelera";
  if (origin === "income") return "Income";
  return origin;
}

function getWalletHighlights(report: ReportData) {
  const dataIndex = report.header.indexOf("data");
  const typeIndex = report.header.indexOf("tipo");
  const descriptionIndex = report.header.indexOf("descricao");
  const orderIndex = report.header.indexOf("pedido");
  const directionIndex = report.header.indexOf("direcao");
  const valueIndex = report.header.indexOf("valor");
  const statusIndex = report.header.indexOf("status");

  if (dataIndex < 0 || valueIndex < 0) return [];

  const movements = report.rows.map((row) => {
    const type = String(row[typeIndex] ?? "").trim();
    const description = String(row[descriptionIndex] ?? "").trim();
    const order = String(row[orderIndex] ?? "").trim();
    const status = String(row[statusIndex] ?? "").trim();
    const direction = String(row[directionIndex] ?? "").trim().toUpperCase();
    const value = numericValue(row[valueIndex]);
    const text = `${type} ${description}`.toLowerCase();
    const kind = classifyWalletMovement(text);

    return {
      row,
      type,
      description,
      order,
      status,
      direction,
      value,
      absValue: Math.abs(value),
      kind
    };
  });

  const usedMovements = new Set<string>();
  const highlightMovements = [
    ["Maior entrada", biggestWalletMovement(movements, (movement) => movement.direction === "IN")],
    ["Maior saida", biggestWalletMovement(movements, (movement) => movement.direction === "OUT")],
    ["Maior saque", biggestWalletMovement(movements, (movement) => movement.kind === "Saque")],
    ["Maior reembolso/estorno", biggestWalletMovement(movements, (movement) => movement.kind === "Reembolso/estorno")],
    ["Maior ajuste", biggestWalletMovement(movements, (movement) => movement.kind === "Ajuste")]
  ] as Array<[string, WalletMovement | undefined]>;

  const highlights = highlightMovements
    .filter(([, movement]) => movement && markWalletMovement(usedMovements, movement))
    .map(([label, movement]) => buildWalletHighlight(label, movement))
    .filter((row): row is string[] => Boolean(row));

  const fallbackRows = movements
    .sort((left, right) => right.absValue - left.absValue)
    .filter((movement) => markWalletMovement(usedMovements, movement))
    .map((movement) => buildWalletHighlight("Movimentacao relevante", movement))
    .filter((row): row is string[] => Boolean(row))
    .slice(0, Math.max(0, 5 - highlights.length));

  return [...highlights, ...fallbackRows].slice(0, 4);
}

type WalletMovement = {
  row: Array<unknown>;
  type: string;
  description: string;
  order: string;
  status: string;
  direction: string;
  value: number;
  absValue: number;
  kind: string;
};

function biggestWalletMovement(movements: WalletMovement[], predicate: (movement: WalletMovement) => boolean) {
  return movements
    .filter(predicate)
    .sort((left, right) => right.absValue - left.absValue)[0];
}

function markWalletMovement(usedMovements: Set<string>, movement: WalletMovement | undefined) {
  if (!movement) return false;
  const key = `${formatDate(movement.row[0])}|${movement.type}|${movement.description}|${movement.order}|${movement.direction}|${movement.value}`;
  if (usedMovements.has(key)) return false;
  usedMovements.add(key);
  return true;
}

function buildWalletHighlight(label: string, movement: WalletMovement | undefined) {
  if (!movement) return null;
  const data = formatDate(movement.row[0]);
  const type = compactWalletType(movement);

  return [label, data, type, currency(movement.value)];
}

function classifyWalletMovement(text: string) {
  if (text.includes("saque") || text.includes("withdraw")) return "Saque";
  if (text.includes("reembolso") || text.includes("estorno") || text.includes("refund")) return "Reembolso/estorno";
  if (text.includes("ajuste") || text.includes("adjust")) return "Ajuste";
  if (text.includes("pedido") || text.includes("order")) return "Pedido";
  return "Movimentacao";
}

function compactWalletType(movement: WalletMovement) {
  if (movement.kind !== "Movimentacao") return movement.kind;
  if (movement.type) return limitText(movement.type, 34);
  if (movement.description) return limitText(movement.description, 34);
  return movement.direction === "OUT" ? "Saida" : movement.direction === "IN" ? "Entrada" : "Movimento";
}

function limitText(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

function sumByDirection(report: ReportData, direction: "IN" | "OUT") {
  const directionIndex = report.header.indexOf("direcao");
  const valueIndex = report.header.indexOf("valor");
  if (directionIndex < 0 || valueIndex < 0) return 0;
  return report.rows
    .filter((row) => String(row[directionIndex] ?? "").toUpperCase() === direction)
    .reduce((sum, row) => sum + Math.abs(numericValue(row[valueIndex])), 0);
}

function lastNumericValue(report: ReportData, column: string) {
  const index = report.header.indexOf(column);
  if (index < 0) return 0;
  const row = report.rows.find((item) => item[index] !== null && item[index] !== undefined && item[index] !== "");
  return row ? numericValue(row[index]) : 0;
}

function topRowsByColumn(report: ReportData, valueColumn: string, labelColumn: string, limit: number, groupByLabel = false) {
  const valueIndex = report.header.indexOf(valueColumn);
  const labelIndex = report.header.indexOf(labelColumn);
  if (valueIndex < 0 || labelIndex < 0) return [];

  if (groupByLabel) {
    const grouped = new Map<string, number>();
    for (const row of report.rows) {
      const label = String(row[labelIndex] ?? "N/D") || "N/D";
      grouped.set(label, (grouped.get(label) ?? 0) + numericValue(row[valueIndex]));
    }
    return [...grouped.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([label, value]) => [label, currency(value)]);
  }

  return [...report.rows]
    .sort((left, right) => numericValue(right[valueIndex]) - numericValue(left[valueIndex]))
    .slice(0, limit)
    .map((row) => [String(row[labelIndex] ?? "N/D"), currency(numericValue(row[valueIndex]))]);
}

function numericValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const decimalValue = value as { toNumber?: () => number };
    if (typeof decimalValue.toNumber === "function") return decimalValue.toNumber();
  }
  return Number(value ?? 0) || 0;
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("pt-BR");
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-slate-300 pb-3">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{description}</p>
    </div>
  );
}

function InfoTable({ header, rows }: { header: string[]; rows: string[][] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {header.map((column) => <TableHead key={column}>{column}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <TableCell key={`${rowIndex}-${cellIndex}`} className={cellIndex === 0 ? "font-semibold" : ""}>
                {cell || "-"}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function normalizeSections(value: string | string[] | undefined): Array<PrintableSection["type"]> {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const available = new Set(PRINTABLE_SECTIONS.map((section) => section.type));
  const selected = values.filter((section): section is PrintableSection["type"] => available.has(section as PrintableSection["type"]));
  return selected.length ? selected : ["overview", "sales", "products", "fees", "financial"];
}

function normalizeDateMode(value: string | undefined): SalesConciliationDateMode {
  return value === "sale" || value === "payment" ? value : "erp";
}
