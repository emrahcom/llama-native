# /v1/chat/completions

Generates a chat completion from a list of messages. Supports both non-streaming
(`Promise` return) and streaming (`AsyncIterable` return) modes, selected by the
`stream` field of the request.

## Location

`src/v1/chat/`

This endpoint introduces the `Chat` sub-group under `V1`, per the sub-group
template in `specs/core/llama.md`. `V1` gains a `readonly chat: Chat` property;
`Chat` is constructed with the same `Config` that `V1` holds, the same way
`Llama` constructs `V1`. The template applies recursively, one level deeper.

## TypeScript surface

```ts
export interface V1ChatCompletionsRequest extends V1GenerationParams {
  messages: V1Message[];
  stream?: boolean;
}

export interface V1Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface V1ChatCompletionsResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: V1ChatChoice[];
  usage: V1Usage;
  system_fingerprint?: string;
}

export interface V1ChatChoice {
  index: number;
  message: V1AssistantMessage;
  finish_reason: "stop" | "length";
}

export interface V1AssistantMessage {
  role: "assistant";
  content: string;
  reasoning_content?: string;
}

export interface V1ChatCompletionsChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: V1ChatChunkChoice[];
  usage?: V1Usage;
  system_fingerprint?: string;
}

export interface V1ChatChunkChoice {
  index: number;
  delta: V1Delta;
  finish_reason: "stop" | "length" | null;
}

export interface V1Delta {
  role?: "assistant";
  content?: string | null;
  reasoning_content?: string;
}
```

`V1Usage` is the shared v1 type defined in `src/types/v1.ts` (per the
shared-types rule in `specs/conventions.md`), not in `src/v1/chat/`. It is
referenced by the chat completions response and chunk here, not re-declared.

Called as

```
llama.v1.chat.completions(
  request: V1ChatCompletionsRequest & { stream: true },
  options?: { signal?: AbortSignal },
): AsyncIterable<V1ChatCompletionsChunk>;

llama.v1.chat.completions(
  request: V1ChatCompletionsRequest & { stream?: false | undefined },
  options?: { signal?: AbortSignal },
): Promise<V1ChatCompletionsResponse>;
```

The overload selected depends on the literal type of `request.stream`:

- `stream: true` selects the streaming overload, returning
  `AsyncIterable<V1ChatCompletionsChunk>`
- `stream: false`, omitted, or `undefined` selects the non-streaming overload,
  returning `Promise<V1ChatCompletionsResponse>`
- A `stream` value typed as `boolean` (not a literal) matches neither overload
  and produces a compile error; consumers in that case narrow the value before
  calling

### Request fields

- `messages`\
  is the conversation so far, an ordered list of `V1Message` objects
- `stream`\
  selects streaming mode when `true`; non-streaming when `false`, omitted, or
  `undefined`

The shared request fields are documented in
`specs/core/v1-generation-params.md`.

Each `V1Message` has:

- a `role`: `"system"`, `"user"`, or `"assistant"`
- a `content`: the message text

Omitted optional fields use llama-server defaults.

### Non-streaming response fields

- `id`\
  is the request identifier assigned by the server
- `object`\
  is the discriminator (always `"chat.completion"`)
- `created`\
  is the Unix-seconds timestamp
- `model`\
  is the model that generated the response
- `choices`\
  is the list of generated chat completions
- `usage`\
  is the token counts for the request
- `system_fingerprint`\
  is the server build identifier (optional)

Each `V1ChatChoice` has:

- an `index` (position in the choices array)
- a `message` (the assistant's reply, a `V1AssistantMessage`)
- a `finish_reason` (`"stop"` when generation halted at a stop sequence or end
  of output, `"length"` when it halted at `max_tokens`)

The server's `"tool_calls"` finish reason is intentionally excluded: this
endpoint exposes no tool inputs, so the server never emits it. It would be added
alongside tool support.

Each `V1AssistantMessage` has:

- a `role`, always `"assistant"`
- a `content`, the reply text; may be an empty string when the model produced no
  reply text (for example, a reasoning model whose output was cut off during
  reasoning)
- an optional `reasoning_content`, the model's reasoning output; present for
  reasoning models, absent otherwise

### Streaming chunk fields

Each `V1ChatCompletionsChunk` has the same top-level fields as
`V1ChatCompletionsResponse`, with `choices: V1ChatChunkChoice[]` instead of
`V1ChatChoice[]`, and `usage` optional (llama-server may include it on the final
chunk depending on configuration).

Each `V1ChatChunkChoice` has:

- an `index` with the same meaning as `V1ChatChoice`
- a `delta` (a `V1Delta`: the incremental piece of the assistant's reply)
- a `finish_reason` that is `null` while generation is in progress and becomes
  `"stop"` or `"length"` on the final chunk

Each `V1Delta` has:

- an optional `role`, present only on the first chunk for a choice, always
  `"assistant"`
- an optional `content`, the reply text fragment for this chunk; may be `null`
  (the first chunk for a choice carries the `role` with `content: null` before
  any text is produced)
- an optional `reasoning_content`, the reasoning text fragment for this chunk;
  present for reasoning models

Consumers reconstruct the full reply by concatenating the non-null
`delta.content` values across chunks for each `index`, and the reasoning trace
by concatenating `delta.reasoning_content` the same way.

## Request

`POST /v1/chat/completions` with `V1ChatCompletionsRequest` as the
JSON-serialized body. Optional fields are omitted from the body when not
provided.

When `stream: true` is set in the request body, llama-server responds with
Server-Sent Events. When `stream` is `false`, omitted, or `undefined`, it
responds with a single JSON document.

## Response

Non-streaming: parsed JSON as `V1ChatCompletionsResponse`. Errors handled per
`specs/core/request.md`.

Streaming: an `AsyncIterable<V1ChatCompletionsChunk>` produced by
`requestStream` from `specs/core/streaming.md`. Each iteration yields the next
chunk parsed from an SSE `data:` event. Errors handled per
`specs/core/streaming.md`.
