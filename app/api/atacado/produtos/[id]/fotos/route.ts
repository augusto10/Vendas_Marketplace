import { fail, handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { addProdutoFoto } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.produtos.manage", request);
    if (access.error) return access.error;

    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("VALIDATION_ERROR", "Arquivo obrigatorio.", 422);

    const foto = await addProdutoFoto(id, file, formData.get("principal") === "true");
    return ok({ foto }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

