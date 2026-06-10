import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { getAtacadoDashboard } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.dashboard.view", request);
    if (access.error) return access.error;

    const dashboard = await getAtacadoDashboard();
    return ok({ dashboard });
  } catch (error) {
    return handleApiError(error);
  }
}

