import { ok, handleApiError } from "@/lib/api-response";
import { requireAnyPermission } from "@/lib/atacado/permissions";
import { getSaldoCliente } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAnyPermission(["atacado.financeiro.view", "atacado.clientes.view", "atacado.pedidos.create"], request);
    if (access.error) return access.error;

    const { id } = await context.params;
    const saldo = await getSaldoCliente(id);
    return ok({ saldo });
  } catch (error) {
    return handleApiError(error);
  }
}
