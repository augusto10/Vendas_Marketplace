import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { produtoSchema } from "@/lib/atacado/schemas";
import { updateProduto } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function updateProdutoRequest(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("atacado.produtos.manage", request);
  if (access.error) return access.error;

  const { id } = await context.params;
  const body = produtoSchema.parse(await request.json());
  const produto = await updateProduto(id, body);
  return ok({ produto });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await updateProdutoRequest(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await updateProdutoRequest(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

