import { unlink } from "fs/promises";
import { auth } from "@/lib/auth/auth";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLOW_PROCESSING_MINUTES = 10;

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

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Sessao obrigatoria.", 401);
    if (!hasPermission(session.user, "uploads.delete")) return fail("FORBIDDEN", "Sem permissao para cancelar uploads.", 403);

    const { id } = await params;
    const upload = await prisma.upload.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        storagePath: true,
        processedAt: true,
        createdAt: true
      }
    });

    if (!upload) return fail("NOT_FOUND", "Upload nao encontrado.", 404);

    const slowProcessing = isSlowProcessing(upload, new Date());
    if (upload.status !== "FAILED" && !slowProcessing) {
      return fail("UPLOAD_NOT_CANCELABLE", "Somente importacoes com falha ou processamento demorado podem ser canceladas.", 409);
    }

    await prisma.upload.delete({ where: { id: upload.id } });

    if (upload.storagePath) {
      await unlink(upload.storagePath).catch(() => undefined);
    }

    return ok({ id: upload.id, canceled: true });
  } catch (error) {
    return handleApiError(error);
  }
}

function processingMinutes(upload: { createdAt: Date }, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - upload.createdAt.getTime()) / 60000));
}

function isSlowProcessing(upload: { status: string; processedAt: Date | null; createdAt: Date }, now: Date) {
  return upload.status === "PROCESSING" && !upload.processedAt && processingMinutes(upload, now) >= SLOW_PROCESSING_MINUTES;
}
