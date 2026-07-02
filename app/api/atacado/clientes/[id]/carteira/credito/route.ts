import { fail, ok, handleApiError } from "@/lib/api-response";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requirePermission } from "@/lib/atacado/permissions";
import { adicionarSaldoCarteiraCliente } from "@/lib/atacado/service";
import { cloudinaryFolder, uploadFile } from "@/lib/cloudinary/upload";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const saldoSchema = z.object({
  valor: z.coerce.number().positive(),
  observacao: z.string().optional().nullable(),
  dataCompetencia: z.coerce.date().optional().nullable(),
  senha: z.string().min(1)
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const access = await requirePermission("atacado.financeiro.update", request);
    if (access.error || !access.user) return access.error;

    const { id } = await context.params;
    const contentType = request.headers.get("content-type") ?? "";
    const formData = contentType.includes("multipart/form-data") ? await request.formData() : null;
    const file = formData?.get("file");
    const body = saldoSchema.parse(formData ? {
      valor: formData.get("valor"),
      observacao: formData.get("observacao"),
      dataCompetencia: formData.get("dataCompetencia") || undefined,
      senha: formData.get("senha")
    } : await request.json());
    const observacao = body.observacao?.trim() ?? "";

    if (!observacao && !(file instanceof File)) {
      return fail("VALIDATION_ERROR", "Informe a observacao de como foi pago ou anexe o comprovante.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: access.user.id },
      select: { passwordHash: true }
    });
    const validPassword = user?.passwordHash ? await bcrypt.compare(body.senha, user.passwordHash) : false;
    if (!validPassword) {
      return fail("INVALID_PASSWORD", "Senha do administrador invalida.", 401);
    }

    const uploaded = file instanceof File ? await uploadFile(file, cloudinaryFolder("carteira")) : null;
    const movimentos = await adicionarSaldoCarteiraCliente(id, {
      valor: body.valor,
      observacao: observacao || "Saldo adicionado com comprovante.",
      dataCompetencia: body.dataCompetencia ?? undefined,
      criadoPorUsuarioId: access.user.id,
      comprovante: uploaded
    });
    return ok({ movimentos }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
