import { auth } from "@/lib/auth/auth";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth/permissions";
import { getDashboardMetrics, getMonthlySales, getStateRanking } from "@/lib/services/dashboard-service";
import { parsePeriod } from "@/lib/period";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Login necessario.", 401);
    if (!hasPermission(session.user, "dashboard.view")) return fail("FORBIDDEN", "Permissao insuficiente.", 403);

    const url = new URL(request.url);
    const period = parsePeriod({
      start: url.searchParams.get("start") ?? undefined,
      end: url.searchParams.get("end") ?? undefined
    });
    const dateModeParam = url.searchParams.get("dateMode");
    const dateMode = dateModeParam === "sale" || dateModeParam === "payment" ? dateModeParam : "erp";
    const [metrics, monthly, states] = await Promise.all([getDashboardMetrics(period, dateMode), getMonthlySales(period), getStateRanking(period, dateMode)]);
    return ok({ metrics, monthly, states });
  } catch (error) {
    return handleApiError(error);
  }
}
