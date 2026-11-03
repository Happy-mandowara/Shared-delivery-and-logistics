import { NextResponse } from "next/server";
import type { ApiResponse, ApiErrorResponse } from "@nationx/shared";

export function apiSuccess<T>(data: T, status = 200) {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      version: "v1",
    },
  };
  return NextResponse.json(payload, { status });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details: unknown = null
) {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return NextResponse.json(payload, { status });
}

