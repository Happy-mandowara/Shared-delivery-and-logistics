import { NextRequest } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { signAuthToken } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { UserRole } from "@nationx/shared";
import crypto from "crypto";

const RegisterSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address syntax").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "MERCHANT", "PARTNER"]).default("CUSTOMER"),
  address: z.string().optional(),
  locality: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Registration validation failed", 400, parsed.error.format());
    }

    const { fullName, email, password, phone, role, address, locality } = parsed.data;

    // 1. Check for duplicate email
    const existing = await pool.query(
      `SELECT id FROM public.users WHERE lower(email) = lower($1)`,
      [email]
    );

    if (existing.rows.length > 0) {
      return apiError(
        "EMAIL_ALREADY_EXISTS",
        "An account with this email address already exists. Please sign in.",
        409
      );
    }

    const newUserId = crypto.randomUUID();
    const cleanPhone = phone ? phone.replace(/[\s\-\+]/g, "").replace(/^91/, "") : null;

    // 2. Ensure auth.users record exists to satisfy foreign key constraint
    await pool.query(
      `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
      [newUserId, email]
    );

    // 3. Insert public user
    const userResult = await pool.query(
      `INSERT INTO public.users (id, name, email, phone, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, name, email, phone, role, is_active AS "isActive", created_at AS "createdAt"`,
      [newUserId, fullName.trim(), email, cleanPhone, role]
    );

    const user = userResult.rows[0];

    // 4. Role-specific provisioning
    if (role === "MERCHANT") {
      // Create initial onboarding draft in public.merchant_onboarding_drafts
      await pool.query(
        `INSERT INTO public.merchant_onboarding_drafts (
           id, user_id, step, completed_steps, form_data, status
         )
         VALUES ($1, $2, 1, '{"account"}', $3, 'DRAFT')`,
        [
          crypto.randomUUID(),
          newUserId,
          JSON.stringify({
            merchantName: fullName,
            email,
            phone: cleanPhone,
            locality: locality || "Khammam Central",
          }),
        ]
      );
    } else if (role === "PARTNER") {
      // Create unverified delivery partner profile in public.delivery_partners
      await pool.query(
        `INSERT INTO public.delivery_partners (
           id, user_id, vehicle_type, capacity_units, availability, current_locality, verified
         )
         VALUES ($1, $2, 'TWO_WHEELER', 10, 'OFFLINE', $3, false)`,
        [crypto.randomUUID(), newUserId, locality || "Khammam Central"]
      );
    } else if (role === "CUSTOMER" && address) {
      // Save customer onboarding address if provided
      await pool.query(
        `INSERT INTO public.customer_addresses (
           id, customer_id, label, address_line, locality, is_default
         )
         VALUES ($1, $2, 'Home', $3, $4, true)`,
        [crypto.randomUUID(), newUserId, address, locality || "Khammam Central"]
      );
    }

    // 5. Generate session token
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    const response = apiSuccess({
      user,
      token,
      message: "Account created successfully.",
    }, 201);

    // 6. Set session cookies
    response.cookies.set("sb-access-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[Register API Error]:", err);
    return apiError("INTERNAL_ERROR", err.message || "Failed to create account", 500);
  }
}
