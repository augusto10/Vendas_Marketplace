import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { aplicarCreditoCarteiraPedido } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.financeiro.update", request);
    if (access.error || !access.user) return access.error;

    const { id } = await context.params;
    const resultado = await aplicarCreditoCarteiraPedido(id, access.user.id);
    return ok(resultado);
  } catch (error) {
    return handleApiError(error);
  }
}
