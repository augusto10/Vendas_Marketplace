import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { entregaSchema } from "@/lib/atacado/schemas";
import { createEntrega } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.separacao.update", request);
    if (access.error || !access.user) return access.error;

    const { id } = await context.params;
    const body = entregaSchema.parse(await request.json());
    const entrega = await createEntrega(id, body, access.user.id);
    return ok({ entrega }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

