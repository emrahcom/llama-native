import type { Config } from "../types/config.ts";
import type { Usage } from "../types/v1.ts";
import {
  request as sendRequest,
  requestStream as sendRequestStream,
} from "../request/mod.ts";
import { Chat } from "./chat/mod.ts";

/** A model available on the llama-server. */
export interface Model {
  /** The model identifier. */
  id: string;
  /** The discriminator, always `"model"`. */
  object: "model";
  /** The creation timestamp, in Unix seconds. */
  created: number;
  /** Typically `"user"` for locally loaded models. */
  owned_by: string;
}

/** The list of models available on the llama-server. */
export interface ModelsResponse {
  /** The discriminator, always `"list"`. */
  object: "list";
  /** The list of available models. */
  data: Model[];
}

/** A request to generate a text completion for a prompt. */
export interface CompletionsRequest {
  /**
   * The input to generate from; accepts a single string, an array of strings
   * (batch), an array of token IDs, or an array of token ID arrays (batch over
   * token sequences).
   */
  prompt: string | string[] | number[] | number[][];
  /**
   * The model identifier; when omitted, llama-server uses its loaded model.
   */
  model?: string;
  /** The upper bound on tokens generated. */
  max_tokens?: number;
  /**
   * A single string or array of strings; generation halts when any is produced.
   */
  stop?: string | string[];
  /** The sampling temperature. */
  temperature?: number;
  /**
   * Selects streaming mode when `true`; non-streaming when `false`, omitted, or
   * `undefined`.
   */
  stream?: boolean;
}

/** A non-streaming text completion response. */
export interface CompletionsResponse {
  /** The request identifier assigned by the server. */
  id: string;
  /** The discriminator, always `"text_completion"`. */
  object: "text_completion";
  /** The Unix-seconds timestamp. */
  created: number;
  /** The model that generated the response. */
  model: string;
  /** The list of generated completions. */
  choices: Choice[];
  /** The token counts for the request. */
  usage: Usage;
  /** The server build identifier (optional). */
  system_fingerprint?: string;
}

/** A single generated completion in a {@link CompletionsResponse}. */
export interface Choice {
  /** The position in the choices array. */
  index: number;
  /** The generated text. */
  text: string;
  /**
   * Always `null` in the current scope (request-side `logprobs` not yet
   * supported).
   */
  logprobs: null;
  /**
   * `"stop"` when generation halted at a stop sequence or end of output,
   * `"length"` when it halted at `max_tokens`.
   */
  finish_reason: "stop" | "length";
}

/**
 * A streaming text completion chunk. Has the same top-level fields as
 * {@link CompletionsResponse}, with `choices: ChunkChoice[]` instead of
 * `Choice[]`, and `usage` optional (llama-server may include it on the final
 * chunk depending on configuration).
 */
export interface CompletionsChunk {
  /** The request identifier assigned by the server. */
  id: string;
  /** The discriminator, always `"text_completion"`. */
  object: "text_completion";
  /** The Unix-seconds timestamp. */
  created: number;
  /** The model that generated the response. */
  model: string;
  /** The list of generated completion deltas. */
  choices: ChunkChoice[];
  /** The token counts for the request. */
  usage?: Usage;
  /** The server build identifier (optional). */
  system_fingerprint?: string;
}

/** A single generated completion delta in a {@link CompletionsChunk}. */
export interface ChunkChoice {
  /** The position in the choices array. */
  index: number;
  /**
   * A _delta_: the new text generated since the previous chunk. Consumers
   * reconstruct the full output by concatenating `text` values across chunks
   * for each `index`.
   */
  text: string;
  /**
   * Always `null` in the current scope (request-side `logprobs` not yet
   * supported).
   */
  logprobs: null;
  /**
   * `null` while generation is in progress; becomes `"stop"` or `"length"` on
   * the final chunk.
   */
  finish_reason: "stop" | "length" | null;
}

/** The `/v1/*` sub-group of {@link Llama}. */
export class V1 {
  #config: Config;
  /** The `/v1/chat/*` sub-group, accessed as `llama.v1.chat`. */
  readonly chat: Chat;

  /**
   * Constructed by the parent {@link Llama} client, never by consumers.
   *
   * @internal
   */
  constructor(config: Config) {
    this.#config = config;
    this.chat = new Chat(config);
  }

  /**
   * Lists the models available on the llama-server.
   *
   * Issues `GET /v1/models` with no body and returns the parsed JSON as a
   * {@link ModelsResponse}. Errors are handled per `specs/core/request.md`.
   */
  async models(
    options?: { signal?: AbortSignal },
  ): Promise<ModelsResponse> {
    return await sendRequest({
      config: this.#config,
      method: "GET",
      path: "/v1/models",
      signal: options?.signal,
    }) as ModelsResponse;
  }

  /**
   * Generates a text completion for a prompt in streaming mode.
   *
   * Selected when `request.stream` is the literal `true`; returns an
   * `AsyncIterable<CompletionsChunk>` whose each iteration yields the next
   * chunk parsed from an SSE `data:` event. Errors are handled per
   * `specs/core/streaming.md`.
   */
  completions(
    request: CompletionsRequest & { stream: true },
    options?: { signal?: AbortSignal },
  ): AsyncIterable<CompletionsChunk>;
  /**
   * Generates a text completion for a prompt in non-streaming mode.
   *
   * Selected when `request.stream` is `false`, omitted, or `undefined`; issues
   * `POST /v1/completions` with `request` as the JSON-serialized body and
   * returns the parsed JSON as a {@link CompletionsResponse}. Errors are
   * handled per `specs/core/request.md`.
   */
  completions(
    request: CompletionsRequest & { stream?: false | undefined },
    options?: { signal?: AbortSignal },
  ): Promise<CompletionsResponse>;
  completions(
    request: CompletionsRequest,
    options?: { signal?: AbortSignal },
  ): AsyncIterable<CompletionsChunk> | Promise<CompletionsResponse> {
    if (request.stream === true) {
      return sendRequestStream<CompletionsChunk>({
        config: this.#config,
        method: "POST",
        path: "/v1/completions",
        body: request,
        signal: options?.signal,
      });
    }
    return sendRequest({
      config: this.#config,
      method: "POST",
      path: "/v1/completions",
      body: request,
      signal: options?.signal,
    }) as Promise<CompletionsResponse>;
  }
}
