import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, handleApiError, ok } from "@/lib/api-response";
import { createMobileToken } from "@/lib/mobile/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  try {
    const credentials = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } }
            }
          }
        }
      }
    });

    if (!user || user.status !== "ACTIVE" || !user.passwordHash) {
      return fail("INVALID_CREDENTIALS", "Email ou senha invalidos.", 401);
    }

    const valid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!valid) return fail("INVALID_CREDENTIALS", "Email ou senha invalidos.", 401);

    const roles = user.roles.map((entry) => entry.role.slug);
    const permissions = user.roles.flatMap((entry) => entry.role.permissions.map((item) => item.permission.key));
    const token = await createMobileToken({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.imageUrl,
      roles,
      permissions
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return ok({
      token,
      tokenType: "Bearer",
      expiresIn: 60 * 60 * 24 * 7,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.imageUrl,
        roles,
        permissions
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}

