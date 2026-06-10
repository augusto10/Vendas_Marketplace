import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { listEntregasExpedicao } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.separacao.update", request);
    if (access.error) return access.error;

    const entregas = await listEntregasExpedicao();
    return ok({ entregas });
  } catch (error) {
    return handleApiError(error);
  }
}
