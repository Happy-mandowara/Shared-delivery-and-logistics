import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthUser, signAuthToken } from "@/lib/auth";
import { UserRole } from "@nationx/shared";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return apiSuccess({ draft: null, authenticated: false });
    }

    const { rows } = await pool.query(
      `SELECT id, step AS "currentStep", form_data AS "draftData", status, updated_at AS "updatedAt"
       FROM public.merchant_onboarding_drafts
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (rows.length === 0) {
      return apiSuccess({ draft: null, authenticated: true });
    }

    return apiSuccess({ draft: rows[0], authenticated: true });
  } catch (err: any) {
    return apiError(err.message, "FETCH_DRAFT_ERROR", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    let user = await getAuthUser(req);
    const body = await req.json();
    const { currentStep = 1, draftData = {}, submitApplication = false } = body;

    let draftId = null;
    const draftStatus = submitApplication ? "SUBMITTED" : "IN_PROGRESS";

    // If user is not yet logged in but provided email/phone in draftData, resolve or provision user
    if (!user && (draftData.email || draftData.phone)) {
      const email = draftData.email ? draftData.email.trim().toLowerCase() : null;
      const phone = draftData.phone ? draftData.phone.replace(/[\s\-\+]/g, "").replace(/^91/, "") : null;
      const ownerName = draftData.ownerName ? draftData.ownerName.trim() : (draftData.shopName || "Merchant Partner");

      if (email || phone) {
        const existing = await pool.query(
          `SELECT id, name, email, phone, role, is_active AS "isActive" FROM public.users 
           WHERE (email IS NOT NULL AND lower(email) = lower($1)) 
              OR (phone IS NOT NULL AND phone = $2) 
           LIMIT 1`,
          [email || "", phone || ""]
        );

        if (existing.rows.length > 0) {
          user = existing.rows[0];
        } else {
          const targetEmail = email || `${phone || crypto.randomUUID().slice(0, 8)}@merchant.nationx.local`;
          // Check if auth.users already has this email
          const existingAuth = await pool.query(
            `SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
            [targetEmail]
          );

          let newUserId = existingAuth.rows.length > 0 ? existingAuth.rows[0].id : crypto.randomUUID();

          if (existingAuth.rows.length === 0) {
            await pool.query(
              `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`,
              [newUserId, targetEmail]
            );
          }

          const newUserRes = await pool.query(
            `INSERT INTO public.users (id, name, email, phone, role, is_active)
             VALUES ($1, $2, $3, $4, 'MERCHANT', true)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = 'MERCHANT', is_active = true
             RETURNING id, name, email, phone, role, is_active AS "isActive"`,
            [newUserId, ownerName, targetEmail, phone]
          );
          user = newUserRes.rows[0];
        }
      }
    }

    if (user) {
      const existing = await pool.query(
        `SELECT id FROM public.merchant_onboarding_drafts WHERE user_id = $1`,
        [user.id]
      );

      if (existing.rows.length > 0) {
        const updateRes = await pool.query(
          `UPDATE public.merchant_onboarding_drafts
           SET step = $1, form_data = $2, status = $3, updated_at = NOW()
           WHERE user_id = $4
           RETURNING id, step AS "currentStep", form_data AS "draftData", status`,
          [currentStep, JSON.stringify(draftData), draftStatus, user.id]
        );
        draftId = updateRes.rows[0].id;
      } else {
        const insertRes = await pool.query(
          `INSERT INTO public.merchant_onboarding_drafts (user_id, step, form_data, status)
           VALUES ($1, $2, $3, $4)
           RETURNING id, step AS "currentStep", form_data AS "draftData", status`,
          [user.id, currentStep, JSON.stringify(draftData), draftStatus]
        );
        draftId = insertRes.rows[0].id;
      }
    }

    // If submitting the application, create the merchant record
    if (submitApplication) {
      if (!user) {
        return apiError("VALIDATION_ERROR", "Merchant email or phone number is required to register your shop account.", 400);
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const shopName = draftData.shopName ? draftData.shopName.trim() : "Unnamed Store";
        // Sanitize code to strictly match ^[A-Z0-9_-]{3,30}$ with NO spaces
        const rawPrefix = (draftData.code || shopName)
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 8);
        const prefix = rawPrefix.length >= 3 ? rawPrefix : "SHOP";
        const code = `${prefix}_${Math.floor(1000 + Math.random() * 9000)}`;

        const category = draftData.category || "Restaurants";
        const address = draftData.address || "Khammam, Telangana";
        const locality = draftData.locality || "Wyra Road";
        const latitude = parseFloat(draftData.latitude) || 17.2473;
        const longitude = parseFloat(draftData.longitude) || 80.1514;
        const logoUrl = draftData.logoUrl || draftData.logo_url || (Array.isArray(draftData.galleryUrls) ? draftData.galleryUrls[0] : null) || null;
        const coverUrl = draftData.coverUrl || draftData.cover_url || logoUrl;
        const galleryUrls = Array.isArray(draftData.galleryUrls) ? draftData.galleryUrls : [];
        const contactPhone = draftData.phone || draftData.contactPhone || null;
        const operatingHours = draftData.operatingHours || { open: "09:00", close: "22:00", closedDay: "None" };
        const userId = user.id;

        const merchantRes = await client.query(
          `INSERT INTO public.merchants (
             user_id, name, code, category, address, locality, latitude, longitude,
             logo_url, cover_url, gallery_urls, contact_phone, operating_hours,
             is_active, is_approved
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, true)
           ON CONFLICT (user_id) DO UPDATE SET
             name = EXCLUDED.name,
             category = EXCLUDED.category,
             address = EXCLUDED.address,
             locality = EXCLUDED.locality,
             latitude = EXCLUDED.latitude,
             longitude = EXCLUDED.longitude,
             logo_url = COALESCE(EXCLUDED.logo_url, merchants.logo_url),
             cover_url = COALESCE(EXCLUDED.cover_url, merchants.cover_url),
             gallery_urls = EXCLUDED.gallery_urls,
             contact_phone = EXCLUDED.contact_phone,
             operating_hours = EXCLUDED.operating_hours,
             is_active = true,
             is_approved = true
           RETURNING id, name, code, category, locality, is_approved`,
          [
            userId, shopName, code, category, address, locality, latitude, longitude,
            logoUrl, coverUrl, galleryUrls, contactPhone, JSON.stringify(operatingHours)
          ]
        );

        const newMerchant = merchantRes.rows[0];

        if (Array.isArray(draftData.starterProducts) && draftData.starterProducts.length > 0) {
          for (const item of draftData.starterProducts) {
            if (item.name && item.price) {
              await client.query(
                `INSERT INTO public.products (
                   merchant_id, name, category, description, price, unit,
                   stock_status, handling_tag, image_url, image_urls, is_active
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, 'IN_STOCK', 'STANDARD', $7, $8, true)`,
                [
                  newMerchant.id,
                  item.name,
                  category,
                  item.description || "",
                  parseFloat(item.price),
                  item.unit || "piece",
                  item.imageUrl || item.image_url || null,
                  item.imageUrl ? [item.imageUrl] : []
                ]
              );
            }
          }
        }

        // Send notification to admin if admin user exists
        const adminUserRes = await client.query(
          `SELECT id FROM public.users WHERE role = 'ADMIN' LIMIT 1`
        );
        if (adminUserRes.rows.length > 0) {
          await client.query(
            `INSERT INTO public.notifications (
               user_id, type, title, message, deep_link
             )
             VALUES ($1, 'SYSTEM_ALERT', 'New Merchant Application', $2, $3)`,
            [
              adminUserRes.rows[0].id,
              `New shop application submitted: ${shopName} in ${locality}`,
              `/admin/merchants/${newMerchant.id}`
            ]
          );
        }

        await client.query("COMMIT");

        // Issue session token if user exists
        let token = null;
        if (user) {
          token = signAuthToken({
            userId: user.id,
            email: user.email,
            role: UserRole.MERCHANT,
          });
        }

        const response = apiSuccess({
          submitted: true,
          merchantId: newMerchant.id,
          token,
          user: user ? { id: user.id, name: user.name, role: user.role } : null,
          message: "Application submitted successfully! Store is now verified and active.",
        });

        if (token) {
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
        }

        return response;
      } catch (err: any) {
        await client.query("ROLLBACK");
        return apiError("SUBMISSION_FAILED", err.message || "Failed to submit merchant application", 500);
      } finally {
        client.release();
      }
    }

    return apiSuccess({
      saved: true,
      draftId,
      currentStep,
      message: "Onboarding progress saved successfully.",
    });
  } catch (err: any) {
    return apiError("SAVE_DRAFT_ERROR", err.message || "Failed to save draft progress", 500);
  }
}
