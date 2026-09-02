import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_KEY } from "./src/lib/auth-session";

function hasAuthCookie(request: NextRequest) {
  return Boolean(request.cookies.get(AUTH_COOKIE_KEY)?.value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = hasAuthCookie(request);
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/inventory") ||
    pathname.startsWith("/invoice");

  if (pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isAuthenticated ? "/dashboard" : "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if (isProtectedRoute && !isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    return NextResponse.redirect(redirectUrl);
  }

  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/inventory/:path*", "/invoice/:path*", "/login", "/register"],
};
