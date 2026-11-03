import { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/api-response";

export async function POST(req: NextRequest) {
  const response = apiSuccess({ message: "Successfully logged out" });

  // Invalidate HTTP-only Supabase auth cookie
  response.cookies.set("sb-access-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  // Invalidate session cookie
  response.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}

