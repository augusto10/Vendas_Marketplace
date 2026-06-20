import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { liberarEntregaExpedicao } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.entregas.update", request);
    if (access.error || !access.user) return access.error;

    const { id } = await context.params;
    const entrega = await liberarEntregaExpedicao(id, access.user.id);
    return ok({ entrega });
  } catch (error) {
    return handleApiError(error);
  }
}
