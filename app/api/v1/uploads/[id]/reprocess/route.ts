import { auth } from "@/lib/auth/auth";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth/permissions";
import { auditLog } from "@/lib/services/audit-service";
import { reprocessUpload } from "@/lib/services/import-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Login necessario.", 401);
    if (!hasPermission(session.user, "uploads.reprocess")) return fail("FORBIDDEN", "Permissao insuficiente.", 403);
    const { id } = await params;
    const summary = await reprocessUpload(id, session.user.id);
    await auditLog({ actorId: session.user.id, action: "uploads.reprocess", entity: "Upload", entityId: id });
    return ok(summary);
  } catch (error) {
    return handleApiError(error);
  }
}
