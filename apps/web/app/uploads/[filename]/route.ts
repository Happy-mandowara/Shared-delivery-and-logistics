import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/**
 * GET /uploads/[filename]
 * Authoritative dynamic asset serving fallback for newly uploaded files in Next.js.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Prevent path traversal
  const safeFilename = path.basename(filename);
  const ext = path.extname(safeFilename).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  const cwd = process.cwd();
  const potentialPaths = [
    path.join(cwd, "public", "uploads", safeFilename),
    path.join(cwd, "apps", "web", "public", "uploads", safeFilename),
    path.join(cwd, "uploads", safeFilename),
  ];

  for (const filePath of potentialPaths) {
    try {
      const data = await fs.readFile(filePath);
      return new NextResponse(data, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // Continue to next path
    }
  }

  // If not found, return clean SVG placeholder instead of raw 404 to prevent ugly broken image tags
  const placeholderSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none">
      <rect width="400" height="300" fill="#F1F5F9"/>
      <path d="M160 130L185 160L215 120L250 170H150L160 130Z" fill="#CBD5E1"/>
      <circle cx="230" cy="110" r="15" fill="#CBD5E1"/>
      <text x="50%" y="210" dominant-baseline="middle" text-anchor="middle" fill="#64748B" font-family="sans-serif" font-size="14" font-weight="600">
        NationX Product Image
      </text>
    </svg>
  `;

  return new NextResponse(placeholderSvg.trim(), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

