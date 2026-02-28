import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files & Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/backgrounds")
  ) {
    return NextResponse.next();
  }

  // In cross-origin deployment (Vercel + Railway), httpOnly cookies
  // are on the backend domain and invisible to this middleware.
  // Auth protection is handled client-side on each page instead.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
