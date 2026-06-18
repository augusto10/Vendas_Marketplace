import { ok, handleApiError } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { getCarteiraCliente } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.financeiro.view", request);
    if (access.error) return access.error;

    const { id } = await context.params;
    const carteira = await getCarteiraCliente(id);
    const saldo = carteira.carteira.saldoAtual;
    const zero = saldo.sub(saldo);
    return ok({
      cliente: carteira.cliente,
      carteira: carteira.carteira,
      saldo: {
        clienteId: id,
        saldoAtual: saldo,
        saldoBloqueado: carteira.carteira.saldoBloqueado,
        saldoDevedor: saldo.isNegative() ? saldo.abs() : zero,
        creditoDisponivel: saldo.isPositive() ? saldo : zero
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
