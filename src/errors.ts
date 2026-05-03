import type { ErrorDetail } from "./types.ts";

/** Custom error class for handling llama.cpp server-side errors. */
export class LlamaError extends Error {
  readonly status: number;
  readonly error: ErrorDetail;

  constructor(message: string, status: number, error: ErrorDetail) {
    super(message);
    this.name = "LlamaError";
    this.status = status;
    this.error = error;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LlamaError);
    }
  }
}
