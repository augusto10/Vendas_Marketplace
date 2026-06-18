import { ok, handleApiError } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { getRelatorioCarteira } from "@/lib/atacado/service";
import { parsePeriod } from "@/lib/period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.financeiro.view", request);
    if (access.error) return access.error;

    const url = new URL(request.url);
    const period = parsePeriod({
      start: url.searchParams.get("dataInicio") ?? undefined,
      end: url.searchParams.get("dataFim") ?? undefined
    });
    const relatorio = await getRelatorioCarteira({ start: period.start, end: period.end });
    return ok({ relatorio });
  } catch (error) {
    return handleApiError(error);
  }
}
