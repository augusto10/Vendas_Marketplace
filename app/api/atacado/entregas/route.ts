import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { listEntregasMotorista } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.entregas.view", request);
    if (access.error || !access.user) return access.error;

    const entregas = await listEntregasMotorista(access.user.id);
    return ok({ entregas });
  } catch (error) {
    return handleApiError(error);
  }
}
