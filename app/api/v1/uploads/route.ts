import { auth } from "@/lib/auth/auth";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { importMarketplaceFile } from "@/lib/services/import-service";
import { hasPermission } from "@/lib/auth/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Sessao obrigatoria.", 401);
    if (!hasPermission(session.user, "uploads.create")) return fail("FORBIDDEN", "Sem permissao para importar arquivos.", 403);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("VALIDATION_ERROR", "Selecione um arquivo para importar.", 422);

    const summary = await importMarketplaceFile(file, session.user.id);
    if (summary.errors.length) {
      return fail(
        "IMPORT_FAILED",
        "A importacao falhou. Revise a planilha e refaca o upload.",
        422,
        {
          uploadId: summary.uploadId,
          type: summary.type,
          errorsCount: summary.errors.length
        }
      );
    }

    return ok({
      uploadId: summary.uploadId,
      type: summary.type,
      status: summary.errors.length ? "FAILED" : "COMPLETED"
    });
  } catch (error) {
    return handleApiError(error);
  }
}
