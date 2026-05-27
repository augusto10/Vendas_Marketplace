import { auth } from "@/lib/auth/auth";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { hasPermission } from "@/lib/auth/permissions";
import { detectUploadType, validateRequiredColumns } from "@/lib/importers/detector";
import { parseFile } from "@/lib/importers/parser";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return fail("UNAUTHORIZED", "Login necessario.", 401);
    if (!hasPermission(session.user, "uploads.create")) return fail("FORBIDDEN", "Permissao insuficiente.", 403);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return fail("MISSING_FILE", "Arquivo nao enviado.", 400);

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["xls", "xlsx", "csv"].includes(extension)) {
      return fail("INVALID_FILE", "Envie XLS, XLSX ou CSV.", 422);
    }

    const sheets = await parseFile(file);
    const type = detectUploadType(sheets);
    const validation = validateRequiredColumns(type, sheets);

    return ok({
      fileName: file.name,
      type,
      valid: type !== "UNKNOWN" && validation.missing.length === 0,
      validation,
      sheets: sheets.map((sheet) => ({
        name: sheet.name,
        rows: sheet.rows.length,
        headers: sheet.headers,
        preview: sheet.rows.slice(0, 8)
      }))
    });
  } catch (error) {
    return handleApiError(error);
  }
}
