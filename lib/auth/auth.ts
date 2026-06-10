import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

async function getUserAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } }
          }
        }
      }
    }
  });

  if (!user) {
    return { roles: [], permissions: [] };
  }

  return {
    roles: user.roles.map((entry) => entry.role.slug),
    permissions: user.roles.flatMap((entry) => entry.role.permissions.map((item) => item.permission.key))
  };
}

export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.VERCEL === "1",
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
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

        if (!user || user.status !== "ACTIVE" || !user.passwordHash) return null;
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.imageUrl,
          roles: user.roles.map((entry) => entry.role.slug),
          permissions: user.roles.flatMap((entry) => entry.role.permissions.map((item) => item.permission.key))
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.picture = user.image;
        token.roles = "roles" in user ? user.roles : [];
        token.permissions = "permissions" in user ? user.permissions : [];
      } else if (token.sub) {
        const access = await getUserAccess(token.sub);
        token.roles = access.roles;
        token.permissions = access.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.image = token.picture ?? null;
        session.user.roles = (token.roles as string[]) ?? [];
        session.user.permissions = (token.permissions as string[]) ?? [];
      }
      return session;
    }
  }
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
