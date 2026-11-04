import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "nationx-shared-delivery-secret-key-2026";

/**
 * Web Crypto HMAC-SHA256 JWT verifier (compatible with Next.js Edge runtime).
 */
async function verifyJwtEdge(token: string, secret: string): Promise<{ userId: string; email: string; role: string; exp?: number } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const b64toUint8 = (str: string) => {
      let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    };

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = b64toUint8(signatureB64);

    const isValid = await crypto.subtle.verify("HMAC", key, signature, data);
    if (!isValid) return null;

    let b64Payload = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    while (b64Payload.length % 4) b64Payload += "=";
    const payloadJson = atob(b64Payload);
    const payload = JSON.parse(payloadJson);

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract session token from cookies or Authorization header
  let token =
    request.cookies.get("sb-access-token")?.value ||
    request.cookies.get("session")?.value ||
    null;

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  // If no token exists, immediately redirect to /login
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl, 307);
  }

  // Verify JWT token signature and expiration
  const session = await verifyJwtEdge(token, JWT_SECRET);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("error", "session_expired");
    const response = NextResponse.redirect(loginUrl, 307);
    response.cookies.delete("sb-access-token");
    response.cookies.delete("session");
    return response;
  }

  const role = session.role;

  // Role-based access control
  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url), 307);
  }

  if (pathname.startsWith("/merchant") && role !== "MERCHANT" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url), 307);
  }

  if (pathname.startsWith("/partner") && role !== "PARTNER" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/unauthorized", request.url), 307);
  }

  // Token is valid and role has permission
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/merchant/:path*",
    "/partner/:path*",
    "/customer/:path*",
  ],
};

