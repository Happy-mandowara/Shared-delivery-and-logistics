import { NextRequest } from "next/server";
import { z } from "zod";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { signAuthToken } from "@/lib/auth";
import { UserRole } from "@nationx/shared";
import crypto from "crypto";

const PartnerRegisterSchema = z.object({
  fullName: z.string().min(2, "Full legal name is required"),
  phone: z.string().min(10, "Valid 10-digit phone number is required"),
  email: z.string().email("Valid email address is required").optional(),
  drivingLicense: z.string().min(4, "Driving license or document reference is required"),
  vehicleType: z.string().default("TWO_WHEELER"),
  locality: z.string().default("Khammam Central"),
  vehicleRegNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = PartnerRegisterSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid application details", 400, parsed.error.format());
    }

    const { fullName, phone, email, drivingLicense, vehicleType, locality, vehicleRegNumber } = parsed.data;
    const cleanPhone = phone.replace(/[\s\-\+]/g, "").replace(/^91/, "");
    const userEmail = email ? email.trim().toLowerCase() : `${cleanPhone}@rider.nationx.local`;

    // 1. Check if user already exists
    let userId: string;
    const existingUser = await pool.query(
      `SELECT id FROM public.users WHERE phone = $1 OR lower(email) = lower($2)`,
      [cleanPhone, userEmail]
    );

    const existingAuthUser = await pool.query(
      `SELECT id FROM auth.users WHERE lower(email) = lower($1)`,
      [userEmail]
    );

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
    } else if (existingAuthUser.rows.length > 0) {
      userId = existingAuthUser.rows[0].id;
      await pool.query(
        `INSERT INTO public.users (id, name, email, phone, role, is_active)
         VALUES ($1, $2, $3, $4, 'PARTNER', true)
         ON CONFLICT (id) DO UPDATE SET role = 'PARTNER', phone = $4`,
        [userId, fullName.trim(), userEmail, cleanPhone]
      );
    } else {
      userId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [userId, userEmail]
      );
      await pool.query(
        `INSERT INTO public.users (id, name, email, phone, role, is_active)
         VALUES ($1, $2, $3, $4, 'PARTNER', true)`,
        [userId, fullName.trim(), userEmail, cleanPhone]
      );
    }

    // 2. Check if delivery partner profile exists
    const partnerId = crypto.randomUUID();
    const existingPartner = await pool.query(
      `SELECT id, verified FROM public.delivery_partners WHERE user_id = $1`,
      [userId]
    );

    if (existingPartner.rows.length > 0) {
      return apiSuccess({
        partnerId: existingPartner.rows[0].id,
        isVerified: existingPartner.rows[0].verified,
        status: existingPartner.rows[0].verified ? "APPROVED" : "UNDER_REVIEW",
        message: "Partner application already exists for this account.",
      });
    }

    // 3. Create unverified partner application record
    await pool.query(
      `INSERT INTO public.delivery_partners (
         id, user_id, vehicle_type, capacity_units, availability, current_locality, verified
       )
       VALUES ($1, $2, $3, 10, 'OFFLINE', $4, false)`,
      [partnerId, userId, vehicleType, locality]
    );

    // 4. Log audit event
    await pool.query(
      `INSERT INTO public.delivery_events (
         type, actor_id, message, reason, metadata
       )
       VALUES ('NOTE', $1, $2, 'PARTNER_ONBOARDING', $3)`,
      [
        userId,
        `Partner application submitted by ${fullName.trim()} (DL: ${drivingLicense}, Locality: ${locality})`,
        JSON.stringify({ partnerId, userId, drivingLicense, locality, vehicleType, vehicleRegNumber }),
      ]
    );

    const token = signAuthToken({
      userId,
      email: userEmail,
      role: UserRole.PARTNER,
    });

    const response = apiSuccess({
      partnerId,
      userId,
      token,
      status: "UNDER_REVIEW",
      verified: false,
      message: "Delivery partner application submitted successfully. Awaiting administrator verification.",
    }, 201);

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
    console.error("[Partner Register Error]:", err);
    return apiError("INTERNAL_ERROR", err.message || "Failed to submit partner application", 500);
  }
}

