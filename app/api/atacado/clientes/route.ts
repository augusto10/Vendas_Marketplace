import { fail, handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { clienteSchema } from "@/lib/atacado/schemas";
import { createCliente, listClientes } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.clientes.view", request);
    if (access.error) return access.error;

    const url = new URL(request.url);
    const clientes = await listClientes(url.searchParams.get("q") ?? undefined);
    return ok({ clientes });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requirePermission("atacado.clientes.manage", request);
    if (access.error) return access.error;

    const body = clienteSchema.parse(await request.json());
    const cliente = await createCliente(body);
    return ok({ cliente }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

