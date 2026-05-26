import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResult<T>>({ ok: true, data }, { status });
}

export function fail(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiResult<never>>({ ok: false, error: { code, message, details } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("VALIDATION_ERROR", "Dados invalidos.", 422, error.flatten());
  }

  if (error instanceof Error) {
    return fail("INTERNAL_ERROR", error.message, 500);
  }

  return fail("INTERNAL_ERROR", "Erro inesperado.", 500);
}
