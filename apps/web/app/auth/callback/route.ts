import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pool } from "@/lib/db";
import { signAuthToken } from "@/lib/auth";
import { UserRole } from "@nationx/shared";

export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const redirectTarget = requestUrl.searchParams.get("redirect") || "";
  const roleIntent = requestUrl.searchParams.get("role") || "CUSTOMER";

  const loginUrl = new URL("/login", requestUrl.origin);

  // 1. Handle OAuth Provider Error (e.g. user cancelled login)
  if (error) {
    loginUrl.searchParams.set("error", errorDescription || "OAuth authentication failed or was cancelled.");
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    loginUrl.searchParams.set("error", "Missing authentication code.");
    return NextResponse.redirect(loginUrl);
  }

  // 2. Exchange Code for Supabase Session
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    // If Supabase is not configured, redirect to login with honest message
    loginUrl.searchParams.set("error", "Supabase authentication is not configured in this environment.");
    return NextResponse.redirect(loginUrl);
  }

  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !sessionData?.user) {
    loginUrl.searchParams.set("error", exchangeError?.message || "Failed to exchange authentication code.");
    return NextResponse.redirect(loginUrl);
  }

  const authUser = sessionData.user;
  const userEmail = authUser.email?.toLowerCase().trim();

  if (!userEmail) {
    loginUrl.searchParams.set("error", "Email is required to establish user session.");
    return NextResponse.redirect(loginUrl);
  }

  try {
    // 3. Find or link user in public.users
    let userRow = null;

    const existingUserRes = await pool.query(
      `SELECT id, name, email, phone, role, is_active AS "isActive"
       FROM public.users
       WHERE lower(email) = $1`,
      [userEmail]
    );

    if (existingUserRes.rows.length > 0) {
      userRow = existingUserRes.rows[0];
    } else {
      // New user registering via Google OAuth
      const fullName = authUser.user_metadata?.full_name || 
                       authUser.user_metadata?.name || 
                       userEmail.split("@")[0];

      // Ensure auth.users has this user id (Supabase handles this, but sync for safety)
      await pool.query(
        `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [authUser.id, userEmail]
      );

      const assignedRole = ["CUSTOMER", "MERCHANT", "PARTNER"].includes(roleIntent)
        ? roleIntent
        : "CUSTOMER";

      const newUserRes = await pool.query(
        `INSERT INTO public.users (id, name, email, role, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING id, name, email, phone, role, is_active AS "isActive"`,
        [authUser.id, fullName, userEmail, assignedRole]
      );
      userRow = newUserRes.rows[0];
    }

    if (!userRow.isActive) {
      loginUrl.searchParams.set("error", "Your account has been suspended. Please contact support.");
      return NextResponse.redirect(loginUrl);
    }

    // 4. Issue authoritative session token
    const token = signAuthToken({
      userId: userRow.id,
      email: userRow.email,
      role: userRow.role as UserRole,
    });

    // 5. Determine redirect route based on role
    let destination = "/customer";
    if (redirectTarget && redirectTarget.startsWith("/")) {
      destination = redirectTarget;
    } else {
      switch (userRow.role) {
        case "ADMIN":
          destination = "/admin";
          break;
        case "MERCHANT":
          destination = "/merchant";
          break;
        case "PARTNER":
          destination = "/partner";
          break;
        default:
          destination = "/customer";
          break;
      }
    }

    const redirectResponse = NextResponse.redirect(new URL(destination, requestUrl.origin));

    // 6. Set secure cookies
    redirectResponse.cookies.set("sb-access-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    redirectResponse.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return redirectResponse;
  } catch (err: any) {
    console.error("[OAuth Callback Error]:", err);
    loginUrl.searchParams.set("error", "An internal error occurred during authentication.");
    return NextResponse.redirect(loginUrl);
  }
}
