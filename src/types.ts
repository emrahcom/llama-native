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

// -----------------------------------------------------------------------------
// Submodule Exports
// -----------------------------------------------------------------------------
export type * from "./native/types.ts";
export type * from "./server/types.ts";

/** OpenAI-compatible API types. */
export type * as V1 from "./v1/types.ts";
