import { auth } from "@/lib/auth/auth";
import { fail } from "@/lib/api-response";
import { hasPermission, type PermissionKey } from "@/lib/auth/permissions";
import { getBearerToken, verifyMobileToken } from "@/lib/mobile/token";

type PermissionUser = {
  id: string;
  roles: string[];
  permissions: string[];
};

export async function requirePermission(permission: PermissionKey, request?: Request) {
  const token = request ? getBearerToken(request) : null;
  let user: PermissionUser | null = token ? await verifyMobileToken(token) : null;

  if (!user) {
    const session = await auth();
    user = session?.user ?? null;
  }

  if (!user) {
    return { error: fail("UNAUTHORIZED", "Login necessario.", 401), user: null };
  }

  if (!hasPermission(user, permission)) {
    return { error: fail("FORBIDDEN", "Permissao insuficiente.", 403), user: null };
  }

  return { error: null, user };
}

export async function requireAnyPermission(permissions: PermissionKey[], request?: Request) {
  const token = request ? getBearerToken(request) : null;
  let user: PermissionUser | null = token ? await verifyMobileToken(token) : null;

  if (!user) {
    const session = await auth();
    user = session?.user ?? null;
  }

  if (!user) {
    return { error: fail("UNAUTHORIZED", "Login necessario.", 401), user: null };
  }

  if (!permissions.some((permission) => hasPermission(user, permission))) {
    return { error: fail("FORBIDDEN", "Permissao insuficiente.", 403), user: null };
  }

  return { error: null, user };
}
