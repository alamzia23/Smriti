import { NextRequest, NextResponse } from "next/server";

// Defense-in-depth security headers on every response, including a nonce-based CSP.
// Next.js reads the CSP from the *request* header we set here and automatically
// adds the nonce to its own inline bootstrap scripts. We allow 'unsafe-inline'
// for styles only — a documented, narrow relaxation required by Reactflow and
// Next's inline style injection (script-src stays nonce-locked).
export function proxy(request: NextRequest) {
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
}

export const config = {
  // Run on everything except static assets and the image optimizer.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    },
  ],
};
