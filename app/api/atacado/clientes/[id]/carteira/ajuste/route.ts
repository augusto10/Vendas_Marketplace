import { ok, handleApiError } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { carteiraAjusteSchema } from "@/lib/atacado/schemas";
import { criarAjusteManual } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.financeiro.update", request);
    if (access.error || !access.user) return access.error;

    const { id } = await context.params;
    const body = carteiraAjusteSchema.parse(await request.json());
    const movimento = await criarAjusteManual(id, {
      valor: body.valor,
      natureza: body.tipo,
      observacao: body.observacao,
      dataCompetencia: body.dataCompetencia ?? undefined,
      criadoPorUsuarioId: access.user.id
    });
    return ok({ movimento }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
