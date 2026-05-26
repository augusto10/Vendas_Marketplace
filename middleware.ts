import { getToken } from "next-auth/jwt";
import { type NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/login", "/api/auth"];

export default async function middleware(req: NextRequest) {
  const isPublic = publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route));
  if (isPublic) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
