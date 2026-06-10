import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { produtoSchema } from "@/lib/atacado/schemas";
import { createProduto, listProdutos } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.produtos.view", request);
    if (access.error) return access.error;

    const url = new URL(request.url);
    const produtos = await listProdutos(url.searchParams.get("q") ?? undefined);
    return ok({ produtos });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requirePermission("atacado.produtos.manage", request);
    if (access.error) return access.error;

    const body = produtoSchema.parse(await request.json());
    const produto = await createProduto(body);
    return ok({ produto }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

