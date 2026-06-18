import { endOfDay, startOfDay } from "date-fns";
import { ok, handleApiError } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { carteiraExtratoQuerySchema } from "@/lib/atacado/schemas";
import { getExtratoCarteiraCliente } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.financeiro.view", request);
    if (access.error) return access.error;

    const { id } = await context.params;
    const url = new URL(request.url);
    const query = carteiraExtratoQuerySchema.parse({
      dataInicio: url.searchParams.get("dataInicio") ?? undefined,
      dataFim: url.searchParams.get("dataFim") ?? undefined,
      tipo: url.searchParams.get("tipo") ?? undefined,
      pedidoId: url.searchParams.get("pedidoId") ?? undefined
    });

    const extrato = await getExtratoCarteiraCliente(id, {
      dataInicio: query.dataInicio ? startOfDay(query.dataInicio) : undefined,
      dataFim: query.dataFim ? endOfDay(query.dataFim) : undefined,
      tipo: query.tipo,
      pedidoId: query.pedidoId
    });

    return ok({ extrato });
  } catch (error) {
    return handleApiError(error);
  }
}
