import { fail, handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { clienteSchema } from "@/lib/atacado/schemas";
import { createCliente, listClientes, listClientesPage } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.clientes.view", request);
    if (access.error) return access.error;

    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? undefined;
    const pageParam = url.searchParams.get("page");
    const takeParam = url.searchParams.get("take");

    if (pageParam || takeParam) {
      const page = Number(pageParam ?? "1");
      const take = Number(takeParam ?? "20");
      const result = await listClientesPage({ query: q, page, take });
      return ok({ ...result });
    }

    const clientes = await listClientes(q);
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

