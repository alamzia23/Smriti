import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Paths reachable without a session: the sign-in page, the Auth.js endpoints
// (otherwise you could never sign in), and the incident webhook — which is
// authenticated by its HMAC signature, not a browser session, and is called
// server-to-server by the simulate route.
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/signin" ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/incidents/webhook"
  );
}

// Proxy = security headers (nonce-based CSP) + session gate. Wrapped with
// Auth.js `auth()` so `request.auth` is the current session on every request.
// Defense-in-depth: Next.js reads the CSP from the *request* header we set here
// and adds the nonce to its own inline bootstrap scripts. 'unsafe-inline' is
// allowed for styles only (a narrow, documented relaxation); script-src stays
// nonce-locked. Unauthenticated requests are redirected to /signin (pages) or
// rejected with 401 (API) — the demo starts secure by default.
export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;

  if (!request.auth && !isPublicPath(pathname)) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.search = pathname !== "/" ? `?from=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const isDev = process.env.NODE_ENV !== "production";

  // 'unsafe-eval' is required by the dev bundler (HMR) only; never in production.
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval' 'strict-dynamic'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  const csp = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js consumes this to nonce its inline scripts.
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  );

  return response;
});

export const config = {
  // Run on everything except static assets and the image optimizer.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    },
  ],
};
