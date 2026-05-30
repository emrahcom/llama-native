import type { Config } from "../../types/config.ts";
import type { Usage } from "../../types/v1.ts";
import {
  request as sendRequest,
  requestStream as sendRequestStream,
} from "../../request/mod.ts";

/** A request to generate a chat completion from a list of messages. */
export interface ChatCompletionsRequest {
  /** The conversation so far, an ordered list of {@link Message} objects. */
  messages: Message[];
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

/** A single message in a conversation. */
export interface Message {
  /** The author of the message. */
  role: "system" | "user" | "assistant";
  /** The message text. */
  content: string;
}

/** A non-streaming chat completion response. */
export interface ChatCompletionsResponse {
  /** The request identifier assigned by the server. */
  id: string;
  /** The discriminator, always `"chat.completion"`. */
  object: "chat.completion";
  /** The Unix-seconds timestamp. */
  created: number;
  /** The model that generated the response. */
  model: string;
  /** The list of generated chat completions. */
  choices: ChatChoice[];
  /** The token counts for the request. */
  usage: Usage;
  /** The server build identifier (optional). */
  system_fingerprint?: string;
}

/** A single generated chat completion in a {@link ChatCompletionsResponse}. */
export interface ChatChoice {
  /** The position in the choices array. */
  index: number;
  /** The assistant's reply. */
  message: AssistantMessage;
  /**
   * `"stop"` when generation halted at a stop sequence or end of output,
   * `"length"` when it halted at `max_tokens`.
   */
  finish_reason: "stop" | "length";
}

/** The assistant's reply in a {@link ChatChoice}. */
export interface AssistantMessage {
  /** Always `"assistant"`. */
  role: "assistant";
  /**
   * The reply text; may be an empty string when the model produced no reply
   * text (for example, a reasoning model whose output was cut off during
   * reasoning).
   */
  content: string;
  /**
   * The model's reasoning output; present for reasoning models, absent
   * otherwise.
   */
  reasoning_content?: string;
}

/**
 * A streaming chat completion chunk. Has the same top-level fields as
 * {@link ChatCompletionsResponse}, with `choices: ChatChunkChoice[]` instead of
 * `ChatChoice[]`, and `usage` optional (llama-server may include it on the final
 * chunk depending on configuration).
 */
export interface ChatCompletionsChunk {
  /** The request identifier assigned by the server. */
  id: string;
  /** The discriminator, always `"chat.completion.chunk"`. */
  object: "chat.completion.chunk";
  /** The Unix-seconds timestamp. */
  created: number;
  /** The model that generated the response. */
  model: string;
  /** The list of generated chat completion deltas. */
  choices: ChatChunkChoice[];
  /** The token counts for the request. */
  usage?: Usage;
  /** The server build identifier (optional). */
  system_fingerprint?: string;
}

/** A single generated chat completion delta in a {@link ChatCompletionsChunk}. */
export interface ChatChunkChoice {
  /** The position in the choices array. */
  index: number;
  /** The incremental piece of the assistant's reply. */
  delta: Delta;
  /**
   * `null` while generation is in progress; becomes `"stop"` or `"length"` on
   * the final chunk.
   */
  finish_reason: "stop" | "length" | null;
}

/**
 * The incremental piece of an assistant's reply in a {@link ChatChunkChoice}.
 *
 * Consumers reconstruct the full reply by concatenating the non-null
 * `content` values across chunks for each `index`, and the reasoning trace by
 * concatenating `reasoning_content` the same way.
 */
export interface Delta {
  /** Present only on the first chunk for a choice, always `"assistant"`. */
  role?: "assistant";
  /**
   * The reply text fragment for this chunk; may be `null` (the first chunk for
   * a choice carries the `role` with `content: null` before any text is
   * produced).
   */
  content?: string | null;
  /**
   * The reasoning text fragment for this chunk; present for reasoning models.
   */
  reasoning_content?: string;
}

/** The `/v1/chat/*` sub-group of {@link Llama}. */
export class Chat {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  /**
   * Generates a chat completion from a list of messages in streaming mode.
   *
   * Selected when `request.stream` is the literal `true`; returns an
   * `AsyncIterable<ChatCompletionsChunk>` whose each iteration yields the next
   * chunk parsed from an SSE `data:` event. Errors are handled per
   * `specs/core/streaming.md`.
   */
  completions(
    request: ChatCompletionsRequest & { stream: true },
    options?: { signal?: AbortSignal },
  ): AsyncIterable<ChatCompletionsChunk>;
  /**
   * Generates a chat completion from a list of messages in non-streaming mode.
   *
   * Selected when `request.stream` is `false`, omitted, or `undefined`; issues
   * `POST /v1/chat/completions` with `request` as the JSON-serialized body and
   * returns the parsed JSON as a {@link ChatCompletionsResponse}. Errors are
   * handled per `specs/core/request.md`.
   */
  completions(
    request: ChatCompletionsRequest & { stream?: false | undefined },
    options?: { signal?: AbortSignal },
  ): Promise<ChatCompletionsResponse>;
  completions(
    request: ChatCompletionsRequest,
    options?: { signal?: AbortSignal },
  ): AsyncIterable<ChatCompletionsChunk> | Promise<ChatCompletionsResponse> {
    if (request.stream === true) {
      return sendRequestStream<ChatCompletionsChunk>({
        config: this.#config,
        method: "POST",
        path: "/v1/chat/completions",
        body: request,
        signal: options?.signal,
      });
    }
    return sendRequest({
      config: this.#config,
      method: "POST",
      path: "/v1/chat/completions",
      body: request,
      signal: options?.signal,
    }) as Promise<ChatCompletionsResponse>;
  }
}
