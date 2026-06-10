import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { pagamentoSchema } from "@/lib/atacado/schemas";
import { registerPagamento } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.financeiro.update", request);
    if (access.error || !access.user) return access.error;

    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    const body = pagamentoSchema.parse({
      status: formData.get("status"),
      valorPago: formData.get("valorPago"),
      observacao: formData.get("observacao")
    });
    const pagamento = await registerPagamento(id, body, access.user.id, file instanceof File ? file : undefined);
    return ok({ pagamento }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

