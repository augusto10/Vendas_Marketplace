import { fail, handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { getPedido } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.pedidos.view", request);
    if (access.error) return access.error;

    const { id } = await context.params;
    const pedido = await getPedido(id);
    if (!pedido) return fail("NOT_FOUND", "Pedido nao encontrado.", 404);
    return ok({ pedido });
  } catch (error) {
    return handleApiError(error);
  }
}

