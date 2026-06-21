import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { statusPedidoSchema } from "@/lib/atacado/schemas";
import { updatePedidoStatus } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = statusPedidoSchema.parse(await request.json());
    const permission = ["EM_SEPARACAO", "SEPARADO", "FALTA_ESTOQUE"].includes(body.status)
      ? "atacado.separacao.update"
      : body.status === "AGUARDANDO_PAGAMENTO"
        ? "atacado.financeiro.update"
        : "atacado.pedidos.update";
    const access = await requirePermission(permission, request);
    if (access.error || !access.user) return access.error;

    const { id } = await context.params;
    const isAdmin = access.user.roles.some((role) => ["master", "admin", "admin_atacado"].includes(role));
    const shouldCreateOpenMovement =
      body.status === "AGUARDANDO_PAGAMENTO" ||
      (body.status === "PAGO" && body.observacao?.toLowerCase().includes("sem pagamento"));
    const pedido = await updatePedidoStatus(id, body, access.user.id, {
      isMaster: isAdmin,
      createOpenMovement: shouldCreateOpenMovement
    });
    return ok({ pedido });
  } catch (error) {
    return handleApiError(error);
  }
}

