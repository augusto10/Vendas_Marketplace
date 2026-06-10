import { auth } from "@/lib/auth/auth";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth/permissions";
import { processPreparedUpload } from "@/lib/services/import-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Sessao obrigatoria.", 401);
    if (!hasPermission(session.user, "uploads.create")) return fail("FORBIDDEN", "Sem permissao para importar arquivos.", 403);

    const { id } = await params;
    const summary = await processPreparedUpload(id);
    return ok(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
