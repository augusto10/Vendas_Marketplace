import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_SEPARACAO: "Aguardando separacao",
  EM_SEPARACAO: "Em separacao",
  SEPARADO: "Separado",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  EM_EXPEDICAO: "Em expedicao",
  EM_ENTREGA: "Em entrega",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
  FALTA_ESTOQUE: "Falta estoque",
  ATIVO: "Ativo",
  INATIVO: "Inativo"
};

const statusClasses: Record<string, string> = {
  AGUARDANDO_SEPARACAO: "border-amber-300/40 bg-amber-300/10 text-amber-700 dark:text-amber-200",
  EM_SEPARACAO: "border-sky-300/40 bg-sky-300/10 text-sky-700 dark:text-sky-200",
  SEPARADO: "border-indigo-300/40 bg-indigo-300/10 text-indigo-700 dark:text-indigo-200",
  AGUARDANDO_PAGAMENTO: "border-orange-300/40 bg-orange-300/10 text-orange-700 dark:text-orange-200",
  PAGO: "border-emerald-300/40 bg-emerald-300/10 text-emerald-700 dark:text-emerald-200",
  EM_EXPEDICAO: "border-cyan-300/40 bg-cyan-300/10 text-cyan-700 dark:text-cyan-200",
  EM_ENTREGA: "border-blue-300/40 bg-blue-300/10 text-blue-700 dark:text-blue-200",
  ENTREGUE: "border-green-300/40 bg-green-300/10 text-green-700 dark:text-green-200",
  CANCELADO: "border-red-300/40 bg-red-300/10 text-red-700 dark:text-red-200",
  FALTA_ESTOQUE: "border-rose-300/40 bg-rose-300/10 text-rose-700 dark:text-rose-200",
  INATIVO: "border-slate-300/40 bg-slate-300/10 text-slate-600 dark:text-slate-200"
};

export function AtacadoStatusBadge({ status }: { status: string }) {
  return <Badge className={cn("whitespace-nowrap", statusClasses[status])}>{statusLabels[status] ?? status}</Badge>;
}

export function statusLabel(status: string) {
  return statusLabels[status] ?? status;
}

