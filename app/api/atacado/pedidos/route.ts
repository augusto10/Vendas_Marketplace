import { type AtacadoPedidoStatus } from "@prisma/client";
import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { pedidoSchema } from "@/lib/atacado/schemas";
import { createPedido, listPedidos } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.pedidos.view", request);
    if (access.error) return access.error;

    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") ?? url.searchParams.get("start");
    const endDate = url.searchParams.get("endDate") ?? url.searchParams.get("end");
    const start = startDate ? new Date(`${startDate}T00:00:00`) : undefined;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : undefined;
    const pedidos = await listPedidos({
      status: (url.searchParams.get("status") as AtacadoPedidoStatus | null) ?? undefined,
      clienteId: url.searchParams.get("clienteId") ?? undefined,
      vendedorId: url.searchParams.get("vendedorId") ?? undefined,
      start,
      end
    });
    return ok({ pedidos });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requirePermission("atacado.pedidos.create", request);
    if (access.error || !access.user) return access.error;

    const body = pedidoSchema.parse(await request.json());
    const pedido = await createPedido(body, access.user.id);
    return ok({ pedido }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

