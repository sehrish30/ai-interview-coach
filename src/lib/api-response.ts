import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/server/auth/require-user";
import { InvalidSessionTransitionError } from "@/server/services/session-state";

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json<ApiErrorBody>({ code, message, details }, { status });
}

/** Maps known error types to consistent HTTP responses so every route
 * doesn't need to repeat this switch. */
export function handleApiError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return apiError(401, "unauthorized", error.message);
  }
  if (error instanceof InvalidSessionTransitionError) {
    return apiError(409, "invalid_state_transition", error.message);
  }
  if (error instanceof ZodError) {
    return apiError(400, "validation_error", "Request failed validation", error.issues);
  }
  console.error(error);
  return apiError(500, "internal_error", "Something went wrong");
}
