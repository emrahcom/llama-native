import type { Config } from "../types/config.ts";
import { request as sendRequest } from "../request/mod.ts";
import { V1 } from "../v1/mod.ts";

/** Options for constructing a {@link Llama} client. */
export interface LlamaOptions {
  /**
   * Base URL of the llama-server. Defaults to `"http://localhost:8080"` (which
   * matches llama-server's default port) when not provided. One or more
   * trailing slashes are stripped.
   */
  baseUrl?: string;
  /** API key sent as a bearer token. Undefined when not provided. */
  apiKey?: string;
}

/** A readiness check for the llama-server. */
export interface HealthResponse {
  /**
   * `"ok"` on a ready server. A not-ready server responds with HTTP 503
   * (surfaced as an error per `specs/core/request.md`), so a successful
   * response's `status` is effectively always `"ok"`; the `string` type is
   * defensive.
   */
  status: string;
}

/** Tokenizes input text into model token IDs. */
export interface TokenizeRequest {
  /** The input text. */
  content: string;
  /**
   * Controls whether the model's special tokens like BOS/EOS are prepended.
   */
  add_special?: boolean;
}

/** The result of a {@link TokenizeRequest}. */
export interface TokenizeResponse {
  /** The resulting list of model token IDs. */
  tokens: number[];
}

const DEFAULT_BASE_URL = "http://localhost:8080";

function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (!baseUrl) return DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

/** The top-level entry point of the module. */
export class Llama {
  // The internal configuration, frozen after construction. Held privately so it
  // is never exposed on the public surface and the `apiKey` it carries is not
  // readable through any public member nor serialized by `JSON.stringify`. To
  // change `baseUrl` or `apiKey`, create a new `Llama` instance.
  #config: Config;
  /** The `/v1/*` sub-group, accessed as `llama.v1`. */
  readonly v1: V1;

  /**
   * Creates a `Llama` client. `baseUrl` defaults to `"http://localhost:8080"`
   * and has trailing slashes stripped; `apiKey` is undefined when omitted. The
   * resulting configuration is frozen.
   */
  constructor(options: LlamaOptions = {}) {
    this.#config = Object.freeze({
      baseUrl: normalizeBaseUrl(options.baseUrl),
      apiKey: options.apiKey,
    });
    this.v1 = new V1(this.#config);
  }

  /**
   * A readiness check for the llama-server.
   *
   * Issues `GET /health` with no body and returns the parsed JSON as a
   * {@link HealthResponse}. Errors are handled per `specs/core/request.md`.
   */
  async health(
    options?: { signal?: AbortSignal },
  ): Promise<HealthResponse> {
    return await sendRequest({
      config: this.#config,
      method: "GET",
      path: "/health",
      signal: options?.signal,
    }) as HealthResponse;
  }

  /**
   * Tokenizes input text into model token IDs.
   *
   * Issues `POST /tokenize` with `request` as the JSON-serialized body and
   * returns the parsed JSON as a {@link TokenizeResponse}. Errors are handled
   * per `specs/core/request.md`.
   */
  async tokenize(
    request: TokenizeRequest,
    options?: { signal?: AbortSignal },
  ): Promise<TokenizeResponse> {
    return await sendRequest({
      config: this.#config,
      method: "POST",
      path: "/tokenize",
      body: request,
      signal: options?.signal,
    }) as TokenizeResponse;
  }
}
