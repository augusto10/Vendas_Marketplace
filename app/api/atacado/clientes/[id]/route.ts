import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { clienteSchema } from "@/lib/atacado/schemas";
import { updateCliente } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.clientes.manage", request);
    if (access.error) return access.error;

    const { id } = await context.params;
    const body = clienteSchema.parse(await request.json());
    const cliente = await updateCliente(id, body);
    return ok({ cliente });
  } catch (error) {
    return handleApiError(error);
  }
}

