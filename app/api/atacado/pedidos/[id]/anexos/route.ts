import { type AtacadoAnexoTipo } from "@prisma/client";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { requireAnyPermission } from "@/lib/atacado/permissions";
import { addPedidoAnexo } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tipos = new Set(["PEDIDO", "SEPARACAO", "COMPROVANTE_PIX", "ENTREGA", "ASSINATURA"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireAnyPermission(["atacado.pedidos.update", "atacado.financeiro.update"], request);
    if (access.error || !access.user) return access.error;

    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    const tipo = String(formData.get("tipo") ?? "PEDIDO");
    if (!(file instanceof File)) return fail("VALIDATION_ERROR", "Arquivo obrigatorio.", 422);
    if (!tipos.has(tipo)) return fail("VALIDATION_ERROR", "Tipo de anexo invalido.", 422);

    const anexo = await addPedidoAnexo(id, file, tipo as AtacadoAnexoTipo, access.user.id);
    return ok({ anexo }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

