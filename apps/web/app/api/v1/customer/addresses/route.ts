import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withUserDb } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { z } from "zod";
import { UserRole } from "@nationx/shared";

const AddressInputSchema = z.object({
  label: z.string().min(1).default("Home"),
  addressLine: z.string().min(5),
  locality: z.string().min(2),
  landmark: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isDefault: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.CUSTOMER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const addresses = await withUserDb(user.id, async (client) => {
      const res = await client.query(
        `SELECT 
           id,
           user_id AS "userId",
           label,
           address_line AS "addressLine",
           locality,
           landmark,
           latitude,
           longitude,
           is_default AS "isDefault",
           created_at AS "createdAt"
         FROM public.customer_addresses
         WHERE user_id = $1
         ORDER BY is_default DESC, created_at DESC`,
        [user.id]
      );
      return res.rows;
    });

    return apiSuccess({ addresses });
  } catch (err: any) {
    return apiError("FETCH_ADDRESSES_FAILED", err.message || "Failed to fetch addresses", 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, [UserRole.CUSTOMER, UserRole.ADMIN]);
  if (auth.errorResponse) return auth.errorResponse;

  const { user } = auth;

  try {
    const body = await req.json();
    const parsed = AddressInputSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Invalid address payload", 400, parsed.error.format());
    }

    const { label, addressLine, locality, landmark, latitude, longitude, isDefault } = parsed.data;

    const saved = await withUserDb(user.id, async (client) => {
      if (isDefault) {
        await client.query(
          `UPDATE public.customer_addresses SET is_default = false WHERE user_id = $1`,
          [user.id]
        );
      }

      const res = await client.query(
        `INSERT INTO public.customer_addresses (
           user_id, label, address_line, locality, landmark, latitude, longitude, is_default
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING 
           id, user_id AS "userId", label, address_line AS "addressLine",
           locality, landmark, latitude, longitude, is_default AS "isDefault",
           created_at AS "createdAt"`,
        [user.id, label, addressLine, locality, landmark || null, latitude || null, longitude || null, isDefault]
      );

      return res.rows[0];
    });

    return apiSuccess({ address: saved }, 201);
  } catch (err: any) {
    return apiError("SAVE_ADDRESS_FAILED", err.message || "Failed to save address", 500);
  }
}

