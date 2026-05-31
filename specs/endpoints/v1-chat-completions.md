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
export interface ChatCompletionsRequest extends GenerationParams {
  messages: Message[];
  stream?: boolean;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionsResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: Usage;
  system_fingerprint?: string;
}

export interface ChatChoice {
  index: number;
  message: AssistantMessage;
  finish_reason: "stop" | "length";
}

export interface AssistantMessage {
  role: "assistant";
  content: string;
  reasoning_content?: string;
}

export interface ChatCompletionsChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: ChatChunkChoice[];
  usage?: Usage;
  system_fingerprint?: string;
}

export interface ChatChunkChoice {
  index: number;
  delta: Delta;
  finish_reason: "stop" | "length" | null;
}

export interface Delta {
  role?: "assistant";
  content?: string | null;
  reasoning_content?: string;
}
```

Called as

```
llama.v1.chat.completions(
  request: ChatCompletionsRequest & { stream: true },
  options?: { signal?: AbortSignal },
): AsyncIterable<ChatCompletionsChunk>;

llama.v1.chat.completions(
  request: ChatCompletionsRequest & { stream?: false | undefined },
  options?: { signal?: AbortSignal },
): Promise<ChatCompletionsResponse>;
```

The overload selected depends on the literal type of `request.stream`:

- `stream: true` selects the streaming overload, returning
  `AsyncIterable<ChatCompletionsChunk>`
- `stream: false`, omitted, or `undefined` selects the non-streaming overload,
  returning `Promise<ChatCompletionsResponse>`
- A `stream` value typed as `boolean` (not a literal) matches neither overload
  and produces a compile error; consumers in that case narrow the value before
  calling

### Request fields

- `messages`\
  is the conversation so far, an ordered list of `Message` objects
- `stream`\
  selects streaming mode when `true`; non-streaming when `false`, omitted, or
  `undefined`

The shared request fields (`model`, `max_tokens`, `stop`, `temperature`) are
documented in `specs/core/generation-params.md`.

Each `Message` has:

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

Each `ChatChoice` has:

- an `index` (position in the choices array)
- a `message` (the assistant's reply, an `AssistantMessage`)
- a `finish_reason` (`"stop"` when generation halted at a stop sequence or end
  of output, `"length"` when it halted at `max_tokens`)

Each `AssistantMessage` has:

- a `role`, always `"assistant"`
- a `content`, the reply text; may be an empty string when the model produced no
  reply text (for example, a reasoning model whose output was cut off during
  reasoning)
- an optional `reasoning_content`, the model's reasoning output; present for
  reasoning models, absent otherwise

### Streaming chunk fields

Each `ChatCompletionsChunk` has the same top-level fields as
`ChatCompletionsResponse`, with `choices: ChatChunkChoice[]` instead of
`ChatChoice[]`, and `usage` optional (llama-server may include it on the final
chunk depending on configuration).

Each `ChatChunkChoice` has:

- an `index` with the same meaning as `ChatChoice`
- a `delta` (a `Delta`: the incremental piece of the assistant's reply)
- a `finish_reason` that is `null` while generation is in progress and becomes
  `"stop"` or `"length"` on the final chunk

Each `Delta` has:

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

`POST /v1/chat/completions` with `ChatCompletionsRequest` as the JSON-serialized
body. Optional fields are omitted from the body when not provided.

When `stream: true` is set in the request body, llama-server responds with
Server-Sent Events. When `stream` is `false`, omitted, or `undefined`, it
responds with a single JSON document.

## Response

Non-streaming: parsed JSON as `ChatCompletionsResponse`. Errors handled per
`specs/core/request.md`.

Streaming: an `AsyncIterable<ChatCompletionsChunk>` produced by `requestStream`
from `specs/core/streaming.md`. Each iteration yields the next chunk parsed from
an SSE `data:` event. Errors handled per `specs/core/streaming.md`.
