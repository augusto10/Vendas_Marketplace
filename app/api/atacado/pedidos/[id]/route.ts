import { fail, handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { pedidoSchema } from "@/lib/atacado/schemas";
import { deletePedido, getPedido, updatePedido } from "@/lib/atacado/service";

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

async function updatePedidoRequest(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("atacado.pedidos.update", request);
  if (access.error || !access.user) return access.error;

  const { id } = await context.params;
  const body = pedidoSchema.parse(await request.json());
  const pedido = await updatePedido(id, body, access.user.id);
  return ok({ pedido });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await updatePedidoRequest(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await updatePedidoRequest(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.pedidos.update", request);
    if (access.error || !access.user) return access.error;

    const isAdmin = access.user.roles.some((role) => ["master", "admin", "admin_atacado"].includes(role));
    if (!isAdmin) return fail("FORBIDDEN", "Somente administradores podem excluir pedidos.", 403);

    const { id } = await context.params;
    const pedido = await deletePedido(id);
    if (!pedido) return fail("NOT_FOUND", "Pedido nao encontrado.", 404);

    return ok({ pedido, deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
