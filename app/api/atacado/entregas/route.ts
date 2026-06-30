import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { listEntregasMotorista } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.entregas.view", request);
    if (access.error || !access.user) return access.error;

    const url = new URL(request.url);
    const scope = url.searchParams.get("scope");
    const roles = access.user.roles ?? [];
    const permissions = access.user.permissions ?? [];
    const isAdmin = roles.some((role) => ["master", "admin", "admin_atacado"].includes(role));
    const hasBroaderAccessRole = roles.some((role) => ["master", "admin", "admin_atacado", "vendas_atacado", "vendas", "vendedor", "financeiro_atacado", "financeiro", "separacao_atacado", "separacao"].includes(role));
    const hasBroaderAccessPermission = permissions.some((permission) => ["atacado.pedidos.view", "atacado.pedidos.update", "atacado.financeiro.view", "atacado.separacao.view"].includes(permission));
    const isDriverRole = roles.some((role) => ["motorista", "motorista_atacado", "driver"].includes(role));
    const isDriverOnly = isDriverRole && !hasBroaderAccessRole && !hasBroaderAccessPermission;
    const canSeeAll = isAdmin || ((scope === "all" || hasBroaderAccessRole || hasBroaderAccessPermission) && !isDriverOnly);

    const entregas = await listEntregasMotorista(canSeeAll ? null : access.user.id);
    return ok({ entregas });
  } catch (error) {
    return handleApiError(error);
  }
}
