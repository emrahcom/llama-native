import type { Config } from "../../types/config.ts";
import type { V1GenerationParams } from "../../types/v1-generation-params.ts";
import type { V1Usage } from "../../types/v1.ts";
import {
  request as sendRequest,
  requestStream as sendRequestStream,
} from "../../request/mod.ts";

/**
 * A request to generate a chat completion from a list of messages. Composes the
 * shared {@link V1GenerationParams}.
 */
export interface V1ChatCompletionsRequest extends V1GenerationParams {
  /** The conversation so far, an ordered list of {@link V1Message} objects. */
  messages: V1Message[];
  /**
   * The list of functions the model may call, each a {@link V1Tool}; omit to
   * disable tool calling.
   */
  tools?: V1Tool[];
  /** Controls whether and which tool the model calls. */
  tool_choice?: V1ToolChoice;
  /**
   * Selects streaming mode when `true`; non-streaming when `false`, omitted, or
   * `undefined`. Tool calling is modeled on the non-streaming path only; the
   * streaming shape of tool calls is not yet modeled.
   */
  stream?: boolean;
}

/**
 * A single message in a conversation. A role-discriminated union; each variant
 * carries only the fields valid for its role.
 */
export type V1Message =
  | V1SystemMessage
  | V1UserMessage
  | V1AssistantInputMessage
  | V1ToolMessage;

/** A system message. */
export interface V1SystemMessage {
  /** Always `"system"`. */
  role: "system";
  /** The message text. */
  content: string;
}

/** A user message. */
export interface V1UserMessage {
  /** Always `"user"`. */
  role: "user";
  /** The message text. */
  content: string;
}

/**
 * A prior assistant turn replayed as input; used to replay a turn that called
 * tools.
 */
export interface V1AssistantInputMessage {
  /** Always `"assistant"`. */
  role: "assistant";
  /** The reply text; `null` when the turn produced only tool calls. */
  content: string | null;
  /** The functions the assistant called on this turn. */
  tool_calls?: V1ToolCall[];
}

/** A tool result answering a prior tool call. */
export interface V1ToolMessage {
  /** Always `"tool"`. */
  role: "tool";
  /** The `id` of the {@link V1ToolCall} this result answers. */
  tool_call_id: string;
  /** The tool result text. */
  content: string;
}

/** One callable function the model may call. */
export interface V1Tool {
  /** Always `"function"`. */
  type: "function";
  /** The function the model may call. */
  function: {
    /** The function name. */
    name: string;
    /** A description of what the function does. */
    description?: string;
    /** A JSON Schema object describing the arguments. */
    parameters: Record<string, unknown>;
  };
}

/**
 * Controls whether and which tool the model calls: `"auto"` (the model
 * decides), `"none"` (never call a tool), `"required"` (must call some tool), or
 * an object forcing a specific function.
 */
export type V1ToolChoice =
  | "auto"
  | "none"
  | "required"
  | { type: "function"; function: { name: string } };

/** A function call requested by the model, carried on an assistant message. */
export interface V1ToolCall {
  /** Correlates the matching {@link V1ToolMessage} result. */
  id: string;
  /** Always `"function"`. */
  type: "function";
  /** The function called. */
  function: {
    /** The function name. */
    name: string;
    /** The JSON-encoded arguments string (the library does not parse it). */
    arguments: string;
  };
}

/** A non-streaming chat completion response. */
export interface V1ChatCompletionsResponse {
  /** The request identifier assigned by the server. */
  id: string;
  /** The discriminator, always `"chat.completion"`. */
  object: "chat.completion";
  /** The Unix-seconds timestamp. */
  created: number;
  /** The model that generated the response. */
  model: string;
  /** The list of generated chat completions. */
  choices: V1ChatChoice[];
  /** The token counts for the request. */
  usage: V1Usage;
  /** The server build identifier (optional). */
  system_fingerprint?: string;
}

/** A single generated chat completion in a {@link V1ChatCompletionsResponse}. */
export interface V1ChatChoice {
  /** The position in the choices array. */
  index: number;
  /** The assistant's reply. */
  message: V1AssistantMessage;
  /**
   * `"stop"` when generation halted at a stop sequence or end of output,
   * `"length"` when it halted at `max_tokens`, `"tool_calls"` when the model
   * stopped to call one or more tools.
   */
  finish_reason: "stop" | "length" | "tool_calls";
}

/** The assistant's reply in a {@link V1ChatChoice}. */
export interface V1AssistantMessage {
  /** Always `"assistant"`. */
  role: "assistant";
  /**
   * The reply text; `null` when the turn produced only tool calls, and may be
   * an empty string when the model produced no reply text (for example, a
   * reasoning model whose output was cut off during reasoning).
   */
  content: string | null;
  /**
   * The model's reasoning output; present for reasoning models, absent
   * otherwise.
   */
  reasoning_content?: string;
  /**
   * The functions the model chose to call; present when `finish_reason` is
   * `"tool_calls"`.
   */
  tool_calls?: V1ToolCall[];
}

/**
 * A streaming chat completion chunk. Has the same top-level fields as
 * {@link V1ChatCompletionsResponse}, with `choices: V1ChatChunkChoice[]` instead of
 * `V1ChatChoice[]`, and `usage` optional (llama-server may include it on the final
 * chunk depending on configuration).
 */
export interface V1ChatCompletionsChunk {
  /** The request identifier assigned by the server. */
  id: string;
  /** The discriminator, always `"chat.completion.chunk"`. */
  object: "chat.completion.chunk";
  /** The Unix-seconds timestamp. */
  created: number;
  /** The model that generated the response. */
  model: string;
  /** The list of generated chat completion deltas. */
  choices: V1ChatChunkChoice[];
  /** The token counts for the request. */
  usage?: V1Usage;
  /** The server build identifier (optional). */
  system_fingerprint?: string;
}

/** A single generated chat completion delta in a {@link V1ChatCompletionsChunk}. */
export interface V1ChatChunkChoice {
  /** The position in the choices array. */
  index: number;
  /** The incremental piece of the assistant's reply. */
  delta: V1Delta;
  /**
   * `null` while generation is in progress; becomes `"stop"` or `"length"` on
   * the final chunk.
   */
  finish_reason: "stop" | "length" | null;
}

/**
 * The incremental piece of an assistant's reply in a {@link V1ChatChunkChoice}.
 *
 * Consumers reconstruct the full reply by concatenating the non-null
 * `content` values across chunks for each `index`, and the reasoning trace by
 * concatenating `reasoning_content` the same way.
 */
export interface V1Delta {
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

  /**
   * Constructed by the parent {@link V1} sub-group, never by consumers.
   *
   * @internal
   */
  constructor(config: Config) {
    this.#config = config;
  }

  /**
   * Generates a chat completion from a list of messages in streaming mode.
   *
   * Selected when `request.stream` is the literal `true`; returns an
   * `AsyncIterable<V1ChatCompletionsChunk>` whose each iteration yields the next
   * chunk parsed from an SSE `data:` event. Errors are handled per
   * `specs/core/streaming.md`.
   */
  completions(
    request: V1ChatCompletionsRequest & { stream: true },
    options?: { signal?: AbortSignal },
  ): AsyncIterable<V1ChatCompletionsChunk>;
  /**
   * Generates a chat completion from a list of messages in non-streaming mode.
   *
   * Selected when `request.stream` is `false`, omitted, or `undefined`; issues
   * `POST /v1/chat/completions` with `request` as the JSON-serialized body and
   * returns the parsed JSON as a {@link V1ChatCompletionsResponse}. Errors are
   * handled per `specs/core/request.md`.
   */
  completions(
    request: V1ChatCompletionsRequest & { stream?: false | undefined },
    options?: { signal?: AbortSignal },
  ): Promise<V1ChatCompletionsResponse>;
  completions(
    request: V1ChatCompletionsRequest,
    options?: { signal?: AbortSignal },
  ):
    | AsyncIterable<V1ChatCompletionsChunk>
    | Promise<V1ChatCompletionsResponse> {
    if (request.stream === true) {
      return sendRequestStream<V1ChatCompletionsChunk>({
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
    }) as Promise<V1ChatCompletionsResponse>;
  }
}
