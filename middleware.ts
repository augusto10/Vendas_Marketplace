import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

const publicRoutes = ["/login", "/api/auth"];

export default async function middleware(req: NextRequest) {
  const isPublic = publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route));
  if (isPublic) return NextResponse.next();

  const session = await auth();
  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${req.nextUrl.pathname}${req.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
