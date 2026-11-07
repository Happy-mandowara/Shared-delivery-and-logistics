import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { UserRole } from "@nationx/shared";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

function getUploadsDir(): string {
  const cwd = process.cwd();
  if (cwd.endsWith(path.join("apps", "web")) || cwd.endsWith("apps/web")) {
    return path.join(cwd, "public", "uploads");
  }
  return path.join(cwd, "apps", "web", "public", "uploads");
}

/**
 * POST /api/v1/upload
 * Handles authenticated image uploads (storefronts, products, verification docs).
 * Uploads to Supabase Storage bucket 'product-images' and mirrors to local disk.
 */
export async function POST(req: NextRequest) {
  const isOnboarding = 
    req.nextUrl.searchParams.get("purpose") === "onboarding" ||
    req.nextUrl.searchParams.get("context") === "onboarding" ||
    req.headers.get("x-onboarding") === "true";

  if (!isOnboarding) {
    const auth = await requireAuth(req, [
      UserRole.CUSTOMER,
      UserRole.MERCHANT,
      UserRole.PARTNER,
      UserRole.ADMIN,
    ]);
    if (auth.errorResponse) return auth.errorResponse;
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let buffer: Buffer;
    let extension = "webp";
    let mimeType = "image/webp";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return apiError("VALIDATION_ERROR", "No file uploaded in 'file' field", 400);
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        return apiError("PAYLOAD_TOO_LARGE", "File size exceeds 5MB limit", 413);
      }

      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return apiError("UNSUPPORTED_MEDIA_TYPE", `File type ${file.type} is not supported. Use JPG, PNG or WebP.`, 415);
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mimeType = file.type;

      if (file.type === "image/png") extension = "png";
      else if (file.type === "image/jpeg") extension = "jpg";
      else if (file.type === "image/webp") extension = "webp";
      else if (file.type === "image/gif") extension = "gif";
    } else {
      // JSON Base64 support
      const body = await req.json().catch(() => null);
      if (!body || !body.data) {
        return apiError("VALIDATION_ERROR", "Missing 'data' base64 string or multipart form", 400);
      }

      const match = body.data.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        const mime = match[1];
        if (!ALLOWED_MIME_TYPES.includes(mime)) {
          return apiError("UNSUPPORTED_MEDIA_TYPE", `MIME ${mime} not allowed`, 415);
        }
        mimeType = mime;
        if (mime.includes("png")) extension = "png";
        else if (mime.includes("jpeg")) extension = "jpg";
        else if (mime.includes("webp")) extension = "webp";
        else if (mime.includes("gif")) extension = "gif";

        buffer = Buffer.from(match[2], "base64");
      } else {
        buffer = Buffer.from(body.data, "base64");
      }

      if (buffer.length > MAX_FILE_SIZE_BYTES) {
        return apiError("PAYLOAD_TOO_LARGE", "Image size exceeds 5MB limit", 413);
      }
    }

    const uniqueId = crypto.randomUUID();
    const fileName = `${uniqueId}.${extension}`;
    const storagePath = `products/${fileName}`;
    const bucket = "product-images";

    // 1. Mirror write to local filesystem as fallback / cache
    try {
      const uploadsDir = getUploadsDir();
      await fs.mkdir(uploadsDir, { recursive: true });
      const filePath = path.join(uploadsDir, fileName);
      await fs.writeFile(filePath, buffer);
    } catch (fsErr) {
      console.warn("[Upload FS Warning]: Could not write to local disk:", fsErr);
    }

    // 2. Persist to authoritative Supabase Storage bucket
    let publicUrl = `/uploads/${fileName}`;
    const supabaseAdmin = createSupabaseAdminClient();
    if (supabaseAdmin) {
      const { data: uploadData, error: storageErr } = await supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (storageErr) {
        console.error("[Supabase Storage Upload Error]:", storageErr);
      } else if (uploadData) {
        const { data: publicUrlData } = supabaseAdmin.storage
          .from(bucket)
          .getPublicUrl(storagePath);
        if (publicUrlData?.publicUrl) {
          publicUrl = publicUrlData.publicUrl;
        }
      }
    }

    return apiSuccess({
      url: publicUrl,
      publicUrl,
      fileName,
      storagePath,
      bucket,
      sizeBytes: buffer.length,
      mimeType,
    }, 201);
  } catch (err: any) {
    return apiError("UPLOAD_FAILED", err.message || "Failed to process image upload", 500);
  }
}
