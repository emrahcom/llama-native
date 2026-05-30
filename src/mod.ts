/**
 * A TypeScript client for llama.cpp's llama-server REST API.
 *
 * The {@link Llama} class is the entry point: construct it with an optional
 * base URL and API key, then call its endpoint methods. Single-segment paths
 * are methods on `Llama` (`llama.health()`, `llama.tokenize()`); `/v1/*` paths
 * are reached through sub-groups (`llama.v1.models()`,
 * `llama.v1.completions()`, `llama.v1.chat.completions()`). Completions support
 * both non-streaming (`Promise`) and streaming (`AsyncIterable`) modes via the
 * request's `stream` field.
 *
 * Failures throw {@link LlamaError} or one of its subclasses
 * ({@link LlamaHTTPError}, {@link LlamaStreamError}), so a single
 * `instanceof LlamaError` check catches any library error.
 *
 * @module
 */
export { Llama } from "./llama/mod.ts";
export type {
  HealthResponse,
  LlamaOptions,
  TokenizeRequest,
  TokenizeResponse,
} from "./llama/mod.ts";
export type {
  Choice,
  ChunkChoice,
  CompletionsChunk,
  CompletionsRequest,
  CompletionsResponse,
  Model,
  ModelsResponse,
} from "./v1/mod.ts";
export type {
  AssistantMessage,
  ChatChoice,
  ChatChunkChoice,
  ChatCompletionsChunk,
  ChatCompletionsRequest,
  ChatCompletionsResponse,
  Delta,
  Message,
} from "./v1/chat/mod.ts";
export type { Usage } from "./types/v1.ts";
export { LlamaError, LlamaHTTPError, LlamaStreamError } from "./errors/mod.ts";
