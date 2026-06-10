import { auth } from "@/lib/auth/auth";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Sessao obrigatoria.", 401);
    if (!hasPermission(session.user, "uploads.view")) return fail("FORBIDDEN", "Sem permissao para visualizar uploads.", 403);

    const { id } = await params;
    const upload = await prisma.upload.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        status: true,
        rowsRead: true,
        rowsTotal: true,
        rowsImported: true,
        rowsUpdated: true,
        progress: true,
        currentStep: true,
        errorsCount: true,
        processedAt: true,
        importErrors: { take: 1, orderBy: { createdAt: "desc" }, select: { message: true } }
      }
    });

    if (!upload) return fail("NOT_FOUND", "Upload nao encontrado.", 404);
    return ok({
      ...upload,
      lastError: upload.importErrors[0]?.message ?? null,
      importErrors: undefined
    });
  } catch (error) {
    return handleApiError(error);
  }
}
