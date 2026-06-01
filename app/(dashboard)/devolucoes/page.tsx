import { PageHeader } from "@/components/page-header";
import { PeriodFilter } from "@/components/period-filter";
import { Card, CardContent, CardHeader, CardTitle, MetricCard, MetricCardContent, MetricCardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePeriod } from "@/lib/period";
import { prisma } from "@/lib/prisma";
import { cn, currency, moneyToneClass, percent, signedCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const returnWalletTerms = [
  { description: { contains: "devolu", mode: "insensitive" as const } },
  { description: { contains: "reembolso", mode: "insensitive" as const } },
  { description: { contains: "return/refund", mode: "insensitive" as const } },
  { transactionType: { contains: "devolu", mode: "insensitive" as const } },
  { transactionType: { contains: "reembolso", mode: "insensitive" as const } },
  { transactionType: { contains: "return/refund", mode: "insensitive" as const } }
];

export default async function DevolucoesPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const period = parsePeriod(await searchParams);
  const incomeReturnWhere = {
    orderCreatedAt: { gte: period.start, lte: period.end },
    sku: { not: "-" },
    OR: [
      { refundAmount: { not: 0 } },
      { buyerRefundedAmount: { not: 0 } },
      { sellerReturnFee: { not: 0 } },
      { reverseShippingFee: { not: 0 } }
    ]
  };
  const [rawRows, totalOrdersInPeriod] = await Promise.all([
    prisma.shopeeIncome.findMany({
      where: incomeReturnWhere,
      orderBy: { orderCreatedAt: "desc" },
      take: 5000
    }),
    prisma.order.count({
      where: { createdAtOrder: { gte: period.start, lte: period.end } }
    })
  ]);
  const rows = dedupeIncomeReturns(rawRows);
  const walletAdjustmentsRaw = await prisma.walletTransaction.findMany({
    where: {
      transactionDate: { gte: period.start, lte: period.end },
      direction: "OUT",
      OR: returnWalletTerms
    },
    orderBy: { transactionDate: "desc" },
    take: 500
  });
  const walletAdjustments = dedupeWalletReturns(walletAdjustmentsRaw);
  const returnsByOrder = buildReturnsByOrder(rows, walletAdjustments);
  const refunds = returnsByOrder.reduce((sum, row) => sum + row.totalConsidered, 0);
  const incomeRefundAmount = returnsByOrder.reduce((sum, row) => sum + row.incomeAmount, 0);
  const walletRefundAmount = returnsByOrder.reduce((sum, row) => sum + row.walletAmount, 0);
  const rate = totalOrdersInPeriod ? (returnsByOrder.length / totalOrdersInPeriod) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Devolucoes e reembolsos" description="Pedidos impactados, valores devolvidos, produtos envolvidos e taxa de devolucao." />
      <PeriodFilter period={period} />
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard><MetricCardHeader><CardTitle>Valor reembolsado</CardTitle></MetricCardHeader><MetricCardContent>{currency(refunds)}</MetricCardContent></MetricCard>
        <MetricCard><MetricCardHeader><CardTitle>Pedidos devolvidos</CardTitle></MetricCardHeader><MetricCardContent>{returnsByOrder.length.toLocaleString("pt-BR")}</MetricCardContent></MetricCard>
        <MetricCard>
          <MetricCardHeader><CardTitle>Taxa de devolucao</CardTitle></MetricCardHeader>
          <MetricCardContent className="text-base font-normal">
            <div className="text-2xl font-semibold">{percent(rate)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {returnsByOrder.length.toLocaleString("pt-BR")} de {totalOrdersInPeriod.toLocaleString("pt-BR")} pedidos vendidos no periodo.
            </div>
          </MetricCardContent>
        </MetricCard>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Devolucoes por pedido</CardTitle>
          <p className="text-sm text-muted-foreground">Income e carteira consolidados em uma unica linha por pedido para evitar duplicidade.</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data pedido</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Income</TableHead>
                <TableHead>Carteira</TableHead>
                <TableHead>Total considerado</TableHead>
                <TableHead>Comparacao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returnsByOrder.map((row) => (
                <TableRow key={row.orderMarketplaceId}>
                  <TableCell>{row.date?.toLocaleDateString("pt-BR") ?? "-"}</TableCell>
                  <TableCell>{row.orderMarketplaceId}</TableCell>
                  <TableCell className="max-w-[420px] truncate">{row.products}</TableCell>
                  <TableCell>{row.source}</TableCell>
                  <SignedMoneyCell value={-row.incomeAmount} />
                  <SignedMoneyCell value={-row.walletAmount} />
                  <SignedMoneyCell value={-row.totalConsidered} />
                  <TableCell className="text-muted-foreground">{row.comparison}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="sticky bottom-0 bg-muted font-semibold">Total</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold">{currency(-incomeRefundAmount)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold">{currency(-walletRefundAmount)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted font-semibold">{currency(-refunds)}</TableCell>
                <TableCell className="sticky bottom-0 bg-muted" />
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SignedMoneyCell({ value }: { value: number | string | null | undefined }) {
  return <TableCell className={cn("font-medium", moneyToneClass(value))}>{signedCurrency(value)}</TableCell>;
}

type IncomeReturnRow = Awaited<ReturnType<typeof prisma.shopeeIncome.findMany>>[number];
type WalletReturnRow = Awaited<ReturnType<typeof prisma.walletTransaction.findMany>>[number];

function dedupeIncomeReturns(rows: IncomeReturnRow[]) {
  return [...new Map(rows.map((row) => [incomeReturnKey(row), row])).values()];
}

function dedupeWalletReturns(rows: WalletReturnRow[]) {
  return [...new Map(rows.map((row) => [walletReturnKey(row), row])).values()];
}

function buildReturnsByOrder(incomeRows: IncomeReturnRow[], walletRows: WalletReturnRow[]) {
  const grouped = new Map<string, {
    orderMarketplaceId: string;
    date: Date | null;
    products: Set<string>;
    incomeAmount: number;
    walletAmount: number;
    hasIncome: boolean;
    hasWallet: boolean;
  }>();

  for (const row of incomeRows) {
    const orderMarketplaceId = row.orderMarketplaceId;
    const current = grouped.get(orderMarketplaceId) ?? {
      orderMarketplaceId,
      date: row.orderCreatedAt,
      products: new Set<string>(),
      incomeAmount: 0,
      walletAmount: 0,
      hasIncome: false,
      hasWallet: false
    };
    if (!current.date || (row.orderCreatedAt && row.orderCreatedAt > current.date)) current.date = row.orderCreatedAt;
    if (row.productName && row.productName !== "-") current.products.add(row.productName);
    const buyerRefund = Number(row.buyerRefundedAmount ?? 0);
    const refund = Number(row.refundAmount ?? 0);
    const sellerReturnFee = Number(row.sellerReturnFee ?? 0);
    const reverseShippingFee = Number(row.reverseShippingFee ?? 0);
    current.incomeAmount += Math.abs(buyerRefund || refund) + Math.abs(sellerReturnFee) + Math.abs(reverseShippingFee);
    current.hasIncome = true;
    grouped.set(orderMarketplaceId, current);
  }

  for (const row of walletRows) {
    const orderMarketplaceId = row.orderMarketplaceId || "-";
    const current = grouped.get(orderMarketplaceId) ?? {
      orderMarketplaceId,
      date: row.transactionDate,
      products: new Set<string>(),
      incomeAmount: 0,
      walletAmount: 0,
      hasIncome: false,
      hasWallet: false
    };
    if (!current.date || row.transactionDate > current.date) current.date = row.transactionDate;
    current.walletAmount += Math.abs(Number(row.amount ?? 0));
    current.hasWallet = true;
    grouped.set(orderMarketplaceId, current);
  }

  return [...grouped.values()]
    .map((row) => {
      const totalConsidered = row.incomeAmount || row.walletAmount;
      return {
        orderMarketplaceId: row.orderMarketplaceId,
        date: row.date,
        products: [...row.products].join(" / ") || "-",
        incomeAmount: row.incomeAmount,
        walletAmount: row.walletAmount,
        totalConsidered,
        source: row.hasIncome && row.hasWallet ? "Income + Carteira" : row.hasIncome ? "Income" : "Carteira",
        comparison: compareReturnSources(row.incomeAmount, row.walletAmount, row.hasIncome, row.hasWallet)
      };
    })
    .sort((left, right) => (right.date?.getTime() ?? 0) - (left.date?.getTime() ?? 0));
}

function compareReturnSources(incomeAmount: number, walletAmount: number, hasIncome: boolean, hasWallet: boolean) {
  if (hasIncome && hasWallet) {
    const difference = Math.abs(incomeAmount - walletAmount);
    return difference < 0.01 ? "Mesmo valor nas duas fontes" : `Diferenca ${currency(difference)}`;
  }
  return hasIncome ? "Somente Income" : "Somente carteira";
}

function incomeReturnKey(row: IncomeReturnRow) {
  return [
    row.orderMarketplaceId,
    row.sku || "-",
    Number(row.refundAmount ?? 0).toFixed(2),
    Number(row.buyerRefundedAmount ?? 0).toFixed(2),
    Number(row.sellerReturnFee ?? 0).toFixed(2),
    Number(row.reverseShippingFee ?? 0).toFixed(2)
  ].join("|");
}

function walletReturnKey(row: WalletReturnRow) {
  return [
    row.orderMarketplaceId || "-",
    row.transactionDate.toISOString().slice(0, 10),
    Number(row.amount ?? 0).toFixed(2),
    normalizeText(`${row.transactionType} ${row.description}`)
  ].join("|");
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
