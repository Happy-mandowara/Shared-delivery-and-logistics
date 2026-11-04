import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth";

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
    const user = await getAuthUser(req);
    const body = await req.json();
    const { currentStep = 1, draftData = {}, submitApplication = false } = body;

    let draftId = null;
    const draftStatus = submitApplication ? "SUBMITTED" : "IN_PROGRESS";

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
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const shopName = draftData.shopName || "Unnamed Store";
        const code = (draftData.code || shopName.slice(0, 4).toUpperCase() + Math.floor(100 + Math.random() * 900));
        const category = draftData.category || "Restaurants";
        const address = draftData.address || "Khammam, Telangana";
        const locality = draftData.locality || "Wyra Road";
        const latitude = parseFloat(draftData.latitude) || 17.2473;
        const longitude = parseFloat(draftData.longitude) || 80.1514;
        const logoUrl = draftData.logoUrl || null;
        const coverUrl = draftData.coverUrl || null;
        const galleryUrls = draftData.galleryUrls || [];
        const contactPhone = draftData.phone || draftData.contactPhone || null;
        const operatingHours = draftData.operatingHours || { open: "09:00", close: "22:00", closedDay: "None" };
        const userId = user?.id || null;

        const merchantRes = await client.query(
          `INSERT INTO public.merchants (
             user_id, name, code, category, address, locality, latitude, longitude,
             logo_url, cover_url, gallery_urls, contact_phone, operating_hours,
             is_active, is_approved
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, false)
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
                  item.imageUrl || null,
                  item.imageUrl ? [item.imageUrl] : []
                ]
              );
            }
          }
        }

        await client.query(
          `INSERT INTO public.notifications (
             user_id, role, type, title, message, link, read
           )
           VALUES (
             (SELECT id FROM public.users WHERE role = 'ADMIN' LIMIT 1),
             'ADMIN',
             'MERCHANT_ONBOARDING',
             'New Merchant Application',
             $1,
             $2,
             false
           )`,
          [
            `New shop application submitted: ${shopName} in ${locality}`,
            `/admin/merchants/${newMerchant.id}`
          ]
        );

        await client.query("COMMIT");

        return apiSuccess({
          submitted: true,
          merchantId: newMerchant.id,
          message: "Application submitted successfully! Our verification officer will review your documents.",
        });
      } catch (err: any) {
        await client.query("ROLLBACK");
        return apiError(err.message, "SUBMISSION_FAILED", 500);
      } finally {
        client.release();
      }
    }

    return apiSuccess({
      saved: true,
      draftId,
      currentStep,
      message: "Onboarding progress saved successfully."
    });
  } catch (err: any) {
    return apiError(err.message, "SAVE_DRAFT_ERROR", 500);
  }
}
