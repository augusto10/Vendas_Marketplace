import { type AtacadoPedidoStatus } from "@prisma/client";
import { readFile } from "fs/promises";
import { handleApiError, ok } from "@/lib/api-response";
import { requirePermission } from "@/lib/atacado/permissions";
import { pedidoSchema } from "@/lib/atacado/schemas";
import { createPedido, listPedidos } from "@/lib/atacado/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const DEBUG_PEDIDO_SESSION_ID = "pedido-numero-conflict";

async function reportPedidoNumeroRouteDebug(location: string, msg: string, data: Record<string, unknown>) {
  let url = "http://127.0.0.1:7777/event";
  let sessionId = DEBUG_PEDIDO_SESSION_ID;

  try {
    const env = await readFile(`.dbg/${DEBUG_PEDIDO_SESSION_ID}.env`, "utf8");
    url = env.match(/DEBUG_SERVER_URL=(.+)/)?.[1]?.trim() || url;
    sessionId = env.match(/DEBUG_SESSION_ID=(.+)/)?.[1]?.trim() || sessionId;
  } catch {}

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        runId: "pre-fix",
        hypothesisId: "E",
        location,
        msg,
        data,
        ts: Date.now()
      })
    });
  } catch {}
}

export async function GET(request: Request) {
  try {
    const access = await requirePermission("atacado.pedidos.view", request);
    if (access.error) return access.error;

    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate") ?? url.searchParams.get("start");
    const endDate = url.searchParams.get("endDate") ?? url.searchParams.get("end");
    const start = startDate ? new Date(`${startDate}T00:00:00`) : undefined;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : undefined;
    const pedidos = await listPedidos({
      status: (url.searchParams.get("status") as AtacadoPedidoStatus | null) ?? undefined,
      clienteId: url.searchParams.get("clienteId") ?? undefined,
      vendedorId: url.searchParams.get("vendedorId") ?? undefined,
      start,
      end
    });
    return ok({ pedidos });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requirePermission("atacado.pedidos.create", request);
    if (access.error || !access.user) return access.error;

    const body = pedidoSchema.parse(await request.json());
    const pedido = await createPedido(body, access.user.id);
    return ok({ pedido }, 201);
  } catch (error) {
    // #region debug-point E:route-post-error
    await reportPedidoNumeroRouteDebug("app/api/atacado/pedidos/route.ts:POST:catch", "[DEBUG] pedidos POST failed", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : typeof error
    });
    // #endregion
    return handleApiError(error);
  }
}

