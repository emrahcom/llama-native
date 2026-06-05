import type { Config } from "../types/config.ts";
import {
  request as sendRequest,
  requestStream as sendRequestStream,
} from "../request/mod.ts";
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

/**
 * A request to generate a text completion for a prompt using llama-server's
 * native API.
 *
 * The sampling fields coincide in name with `V1GenerationParams` because the
 * server defines them identically, not because the types are shared; this is a
 * native-family type and carries no prefix per the API-families rule in
 * `specs/conventions.md`. Omitted optional fields use llama-server defaults.
 */
export interface CompletionRequest {
  /**
   * The input to generate from: a single string, or an array whose elements are
   * text segments (strings) and token IDs (numbers) that the server assembles
   * into one prompt. Unlike `/v1/completions`, the array form is one prompt
   * built from pieces, not a batch.
   */
  prompt: string | (string | number)[];
  /** The maximum number of tokens to predict; -1 means unlimited. */
  n_predict?: number;
  /**
   * An array of stop strings; generation halts before producing any of them.
   * This endpoint accepts only the array form.
   */
  stop?: string[];
  /**
   * The sampling temperature; higher is more random, lower is more
   * deterministic.
   */
  temperature?: number;
  /**
   * Top-k sampling: considers only the k most probable tokens. Lower values
   * make output more focused, higher values more diverse.
   */
  top_k?: number;
  /**
   * Nucleus (top-p) sampling: considers the smallest set of tokens whose
   * cumulative probability reaches this value. Lower values make output more
   * focused.
   */
  top_p?: number;
  /**
   * Min-p sampling: discards tokens less probable than this fraction of the
   * most probable token's probability. Higher values make output more focused.
   */
  min_p?: number;
  /**
   * Penalizes tokens that have already appeared at all, regardless of count,
   * encouraging new topics. Higher values reduce repetition.
   */
  presence_penalty?: number;
  /**
   * Penalizes tokens in proportion to how often they have already appeared.
   * Higher values reduce repetition.
   */
  frequency_penalty?: number;
  /**
   * A multiplicative penalty on recently repeated tokens. Values above 1 reduce
   * repetition; 1 applies no penalty.
   */
  repeat_penalty?: number;
  /**
   * The random seed for the sampler. Set a fixed value for reproducible output
   * across requests with identical parameters.
   */
  seed?: number;
  /**
   * A GBNF grammar; generation is constrained to strings the grammar accepts.
   */
  grammar?: string;
  /**
   * A JSON Schema object; the server converts it to a grammar and constrains
   * output to JSON matching the schema.
   */
  json_schema?: Record<string, unknown>;
  /**
   * Reuses the server's KV cache for the prefix shared with the previous
   * request, so only the unseen suffix is evaluated. Cache reuse can make
   * output nondeterministic across runs; disable it for determinism.
   */
  cache_prompt?: boolean;
  /**
   * Selects streaming mode when `true`; non-streaming when `false`, omitted, or
   * `undefined`.
   */
  stream?: boolean;
}

/** A non-streaming text completion response. */
export interface CompletionResponse {
  /** The generated text. */
  content: string;
  /**
   * Always `true`: a finished generation is the only thing the server returns
   * here, so the type is the literal.
   */
  stop: true;
  /** The model alias reported by the server. */
  model: string;
  /**
   * Why generation stopped: `"eos"` (the model produced its end-of-sequence
   * token), `"word"` (a stop string was produced), `"limit"` (the `n_predict`
   * limit was reached). `"none"` is in the union because the server defines it,
   * though a finished generation reports one of the other three.
   */
  stop_type: "none" | "eos" | "word" | "limit";
  /**
   * The stop string that ended generation, or `""` when generation did not stop
   * on a stop string.
   */
  stopping_word: string;
  /** The number of tokens generated. */
  tokens_predicted: number;
  /** The number of prompt tokens evaluated. */
  tokens_evaluated: number;
  /** The number of prompt tokens reused from the KV cache (see `cache_prompt`). */
  tokens_cached: number;
  /** Indicates the context size was exceeded during generation. */
  truncated: boolean;
  /** The performance measurement for the request. */
  timings: Timings;
}

/**
 * A streaming text completion chunk. Carries a `content` delta and a `stop`
 * flag. While generation is in progress, `stop` is `false` and only the delta
 * fields are present. The final chunk has `stop: true` and carries the
 * completion fields, which is why those are optional here. Consumers
 * reconstruct the full output by concatenating `content` across chunks.
 */
export interface CompletionChunk {
  /** The new text generated since the previous chunk. */
  content: string;
  /** `false` while generation is in progress; `true` on the final chunk. */
  stop: boolean;
  /** The model alias reported by the server (present on the final chunk). */
  model?: string;
  /** Why generation stopped (present on the final chunk). */
  stop_type?: "none" | "eos" | "word" | "limit";
  /** The stop string that ended generation (present on the final chunk). */
  stopping_word?: string;
  /** The number of tokens generated (present on the final chunk). */
  tokens_predicted?: number;
  /** The number of prompt tokens evaluated (present on the final chunk). */
  tokens_evaluated?: number;
  /** The number of prompt tokens reused from the KV cache (present on the final chunk). */
  tokens_cached?: number;
  /** Whether the context size was exceeded (present on the final chunk). */
  truncated?: boolean;
  /** The performance measurement for the request (present on the final chunk). */
  timings?: Timings;
}

/** The performance measurement for a {@link CompletionResponse} request. */
export interface Timings {
  /** The number of prompt tokens processed. */
  prompt_n: number;
  /** The total prompt processing time, in milliseconds. */
  prompt_ms: number;
  /** The average prompt processing time per token, in milliseconds. */
  prompt_per_token_ms: number;
  /** The prompt processing rate, in tokens per second. */
  prompt_per_second: number;
  /** The number of tokens generated. */
  predicted_n: number;
  /** The total generation time, in milliseconds. */
  predicted_ms: number;
  /** The average generation time per token, in milliseconds. */
  predicted_per_token_ms: number;
  /** The generation rate, in tokens per second. */
  predicted_per_second: number;
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

  /**
   * Generates a text completion for a prompt in streaming mode.
   *
   * Selected when `request.stream` is the literal `true`; returns an
   * `AsyncIterable<CompletionChunk>` whose each iteration yields the next chunk
   * parsed from an SSE `data:` event. Native streams use the native termination
   * mode (no `[DONE]` sentinel); the stream ends after the `stop: true` chunk.
   * Errors are handled per `specs/core/streaming.md`.
   */
  completion(
    request: CompletionRequest & { stream: true },
    options?: { signal?: AbortSignal },
  ): AsyncIterable<CompletionChunk>;
  /**
   * Generates a text completion for a prompt in non-streaming mode.
   *
   * Selected when `request.stream` is `false`, omitted, or `undefined`; issues
   * `POST /completion` with `request` as the JSON-serialized body and returns
   * the parsed JSON as a {@link CompletionResponse}. Errors are handled per
   * `specs/core/request.md`.
   */
  completion(
    request: CompletionRequest & { stream?: false | undefined },
    options?: { signal?: AbortSignal },
  ): Promise<CompletionResponse>;
  completion(
    request: CompletionRequest,
    options?: { signal?: AbortSignal },
  ): AsyncIterable<CompletionChunk> | Promise<CompletionResponse> {
    if (request.stream === true) {
      return sendRequestStream<CompletionChunk>({
        config: this.#config,
        method: "POST",
        path: "/completion",
        body: request,
        signal: options?.signal,
      }, "native");
    }
    return sendRequest({
      config: this.#config,
      method: "POST",
      path: "/completion",
      body: request,
      signal: options?.signal,
    }) as Promise<CompletionResponse>;
  }
}
