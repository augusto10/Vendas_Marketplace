import { ok, handleApiError } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { carteiraCreditoSchema } from "@/lib/atacado/schemas";
import { criarCreditoManual } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.financeiro.update", request);
    if (access.error || !access.user) return access.error;

    const { id } = await context.params;
    const body = carteiraCreditoSchema.parse(await request.json());
    const movimento = await criarCreditoManual(id, {
      valor: body.valor,
      observacao: body.observacao,
      dataCompetencia: body.dataCompetencia ?? undefined,
      criadoPorUsuarioId: access.user.id
    });
    return ok({ movimento }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
