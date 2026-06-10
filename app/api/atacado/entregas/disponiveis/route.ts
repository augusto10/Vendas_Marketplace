import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { listPedidosLiberadosParaEntrega } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.entregas.view", request);
    if (access.error) return access.error;

    const pedidos = await listPedidosLiberadosParaEntrega();
    return ok({ pedidos });
  } catch (error) {
    return handleApiError(error);
  }
}
