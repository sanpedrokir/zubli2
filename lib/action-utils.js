import "server-only";
import { unstable_rethrow } from "next/navigation";
import { AuthError } from "./auth";
import { RateLimitError } from "./rate-limit";
import { RequestError } from "./data/requests";
import { IllustrationError } from "./illustration";
import { uuidSchema } from "./validation";

const SAFE_ERRORS = [AuthError, RateLimitError, RequestError, IllustrationError];

export class InputError extends Error {
  constructor(message, fieldErrors) {
    super(message);
    this.name = "InputError";
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Wraps a Server Action body so known errors become friendly form state and
 * unknown errors are logged but never leaked to the browser. Next.js control
 * flow (redirect, notFound) is re-thrown.
 */
export async function runAction(fn) {
  try {
    const result = await fn();
    return { ok: true, error: null, fieldErrors: {}, ...(result ?? {}) };
  } catch (err) {
    unstable_rethrow(err);
    if (err instanceof InputError) {
      return { ok: false, error: err.message, fieldErrors: err.fieldErrors ?? {} };
    }
    if (SAFE_ERRORS.some((E) => err instanceof E)) {
      return { ok: false, error: err.message, fieldErrors: {} };
    }
    console.error("[action error]", err);
    return { ok: false, error: "Something went wrong on our side. Please try again.", fieldErrors: {} };
  }
}

/** Validates that a form value is a UUID; throws InputError otherwise. */
export function requireId(value, label = "item") {
  const parsed = uuidSchema.safeParse(value);
  if (!parsed.success) throw new InputError(`That ${label} could not be found.`);
  return parsed.data;
}
