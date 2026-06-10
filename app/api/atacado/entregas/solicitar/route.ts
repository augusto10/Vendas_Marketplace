import { z } from "zod";
import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { solicitarEntrega } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  pedidoId: z.string().uuid()
});

export async function POST(request: Request) {
  try {
    const access = await requirePermission("atacado.entregas.update", request);
    if (access.error || !access.user) return access.error;

    const body = schema.parse(await request.json());
    const entrega = await solicitarEntrega(body.pedidoId, access.user.id);
    return ok({ entrega }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
