// -----------------------------------------------------------------------------
// Global Exports
// -----------------------------------------------------------------------------
/** Options for initializing the llama.cpp client. */
export interface ClientOptions {
  /**
   * The full base URL of the llama.cpp server.
   * @default "http://localhost:8080"
   */
  baseUrl?: string;

  /**
   * Optional API Key if using a proxy or protected server.
   */
  apiKey?: string;
}

/** Internal config used by submodules to avoid repeat logic. */
export interface Config {
  baseUrl: string;
  apiKey?: string;
}

/** Error detail in the standard ErrorResponse. */
export interface ErrorDetail {
  code: number;
  message: string;
  type: string;
}

/** Standard error response returned by the llama.cpp server. */
export interface ErrorResponse {
  error: ErrorDetail;
}

// -----------------------------------------------------------------------------
// Submodule Exports
// -----------------------------------------------------------------------------
export type * from "./native/types.ts";
export type * from "./server/types.ts";

/** OpenAI-compatible API types. */
export type * as V1 from "./v1/types.ts";
