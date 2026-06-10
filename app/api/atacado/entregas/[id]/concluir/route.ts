import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { concluirEntregaSchema } from "@/lib/atacado/schemas";
import { concluirEntrega } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.entregas.update", request);
    if (access.error || !access.user) return access.error;

    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    const body = concluirEntregaSchema.parse({
      latitude: formData.get("latitude") || undefined,
      longitude: formData.get("longitude") || undefined,
      recebedorNome: formData.get("recebedorNome"),
      assinaturaNome: formData.get("assinaturaNome"),
      observacao: formData.get("observacao")
    });
    const entrega = await concluirEntrega(id, body, access.user.id, file instanceof File ? file : undefined);
    return ok({ entrega });
  } catch (error) {
    return handleApiError(error);
  }
}

