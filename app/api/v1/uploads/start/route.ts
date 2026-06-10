import { auth } from "@/lib/auth/auth";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth/permissions";
import { prepareMarketplaceUpload } from "@/lib/services/import-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Sessao obrigatoria.", 401);
    if (!hasPermission(session.user, "uploads.create")) return fail("FORBIDDEN", "Sem permissao para importar arquivos.", 403);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("VALIDATION_ERROR", "Selecione um arquivo para importar.", 422);

    const upload = await prepareMarketplaceUpload(file, session.user.id);
    return ok({
      uploadId: upload.id,
      type: upload.type,
      status: upload.status,
      rowsTotal: upload.rowsTotal,
      progress: upload.progress,
      currentStep: upload.currentStep
    });
  } catch (error) {
    return handleApiError(error);
  }
}
