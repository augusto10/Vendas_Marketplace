import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { clienteSchema } from "@/lib/atacado/schemas";
import { updateCliente } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function updateClienteRequest(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("atacado.clientes.manage", request);
  if (access.error) return access.error;

  const { id } = await context.params;
  const body = clienteSchema.parse(await request.json());
  const cliente = await updateCliente(id, body);
  return ok({ cliente });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await updateClienteRequest(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await updateClienteRequest(request, context);
  } catch (error) {
    return handleApiError(error);
  }
}

