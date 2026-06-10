import { jwtVerify, SignJWT } from "jose";

const issuer = "vendas-marketplace";
const audience = "atacado-mobile";

export type MobileTokenUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  roles: string[];
  permissions: string[];
};

function getSecret() {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET nao configurado.");
  return new TextEncoder().encode(secret);
}

export async function createMobileToken(user: MobileTokenUser) {
  return new SignJWT({
    name: user.name,
    email: user.email,
    image: user.image ?? null,
    roles: user.roles,
    permissions: user.permissions
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifyMobileToken(token: string): Promise<MobileTokenUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer, audience });
    const roles = Array.isArray(payload.roles) ? payload.roles.filter((role): role is string => typeof role === "string") : [];
    const permissions = Array.isArray(payload.permissions)
      ? payload.permissions.filter((permission): permission is string => typeof permission === "string")
      : [];

    if (!payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string") return null;

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      image: typeof payload.image === "string" ? payload.image : null,
      roles,
      permissions
    };
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

