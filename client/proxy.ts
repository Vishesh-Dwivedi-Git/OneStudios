import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("accessToken");
  const { pathname } = req.nextUrl;

  // Allow public auth routes
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Allow static files & Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Protect everything else
  if (!token) {
    return NextResponse.redirect(
      new URL("/auth/login", req.url)
    );
  }
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
