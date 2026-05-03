import { LlamaError } from "../errors.ts";
import type { ErrorResponse } from "../types.ts";

/** Validates the fetch response and throws LlamaError if the request failed. */
export async function ensureOk(res: Response, context: string): Promise<void> {
  if (!res.ok) {
    const errorData: ErrorResponse = await res.json().catch(() => ({
      error: {
        message: "Unknown error occurred",
        type: "unknown_error",
        code: res.status,
      },
    }));

    throw new LlamaError(
      context,
      res.status,
      errorData.error,
    );
  }
}
