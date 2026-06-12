import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { hasPermission, type PermissionKey } from "@/lib/auth/permissions";

const publicRoutes = ["/login", "/api/auth", "/api/mobile", "/api/atacado"];
const corsRoutes = ["/api/mobile", "/api/atacado"];
const allowedOrigins = new Set(["http://localhost:8081", "http://127.0.0.1:8081", "http://192.168.3.201:8081"]);
const protectedPages: Array<{ path: string; permission: PermissionKey }> = [
  { path: "/atacado/produtos", permission: "atacado.produtos.view" },
  { path: "/atacado/pedidos", permission: "atacado.pedidos.view" },
  { path: "/atacado/clientes", permission: "atacado.clientes.view" },
  { path: "/atacado/separacao", permission: "atacado.separacao.view" },
  { path: "/atacado/financeiro", permission: "atacado.financeiro.view" },
  { path: "/atacado/entregas", permission: "atacado.entregas.view" },
  { path: "/atacado", permission: "atacado.dashboard.view" },
  { path: "/dashboard", permission: "dashboard.view" }
];

function applyCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && allowedOrigins.has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");

  return response;
}

export default async function middleware(req: NextRequest) {
  const isCorsRoute = corsRoutes.some((route) => req.nextUrl.pathname.startsWith(route));
  if (isCorsRoute && req.method === "OPTIONS") {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), req.headers.get("origin"));
  }

  const isPublic = publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route));
  if (isPublic) {
    const response = NextResponse.next();
    return isCorsRoute ? applyCorsHeaders(response, req.headers.get("origin")) : response;
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    secureCookie: req.nextUrl.protocol === "https:"
  });

  if (!token) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
    const response = NextResponse.redirect(loginUrl);
    return isCorsRoute ? applyCorsHeaders(response, req.headers.get("origin")) : response;
  }

  const pageRule = protectedPages.find(({ path }) => (
    req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(`${path}/`)
  ));
  if (pageRule) {
    const roles = Array.isArray(token.roles) ? token.roles.filter((role): role is string => typeof role === "string") : [];
    const permissions = Array.isArray(token.permissions)
      ? token.permissions.filter((permission): permission is string => typeof permission === "string")
      : [];

    if (!hasPermission({ roles, permissions }, pageRule.permission)) {
      return NextResponse.redirect(new URL("/", req.nextUrl.origin));
    }
  }

  const response = NextResponse.next();
  return isCorsRoute ? applyCorsHeaders(response, req.headers.get("origin")) : response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
