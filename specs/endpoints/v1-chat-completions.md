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

## Server requirements

The endpoint works on a default launch for ordinary chat. Tool calling (sending
`tools` / `tool_choice`) additionally requires llama-server to be started with
`--jinja` and a model whose chat template supports tool use; without `--jinja`
the server does not emit `tool_calls`. Image and audio input (an `image_url` or
`input_audio` content part) additionally require a multimodal model with its
projector loaded: with `-hf` the projector loads automatically (`--mmproj-auto`,
on by default), or pass `--mmproj FILE` for a local projector.

## TypeScript surface

```ts
export interface V1ChatCompletionsRequest extends V1GenerationParams {
  messages: V1Message[];
  tools?: V1Tool[];
  tool_choice?: V1ToolChoice;
  stream?: boolean;
}

export type V1Message =
  | V1SystemMessage
  | V1UserMessage
  | V1AssistantMessage
  | V1ToolMessage;

export interface V1SystemMessage {
  role: "system";
  content: string;
}

export interface V1UserMessage {
  role: "user";
  content: string | V1ContentPart[];
}

export interface V1AssistantMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: V1ToolCall[];
}

export interface V1ToolMessage {
  role: "tool";
  tool_call_id: string;
  content: string;
}

export type V1ContentPart = V1TextPart | V1ImagePart | V1AudioPart;

export interface V1TextPart {
  type: "text";
  text: string;
}

export interface V1ImagePart {
  type: "image_url";
  image_url: { url: string; detail?: "auto" | "low" | "high" | "original" };
}

export interface V1AudioPart {
  type: "input_audio";
  input_audio: { data: string; format: "wav" | "mp3" };
}

export interface V1Tool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export type V1ToolChoice =
  | "auto"
  | "none"
  | "required"
  | { type: "function"; function: { name: string } };

export interface V1ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
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
  message: V1AssistantResponseMessage;
  finish_reason: "stop" | "length" | "tool_calls";
}

export interface V1AssistantResponseMessage {
  role: "assistant";
  content: string | null;
  reasoning_content?: string;
  tool_calls?: V1ToolCall[];
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
  finish_reason: "stop" | "length" | "tool_calls" | null;
}

export interface V1Delta {
  role?: "assistant";
  content?: string | null;
  reasoning_content?: string;
  tool_calls?: V1DeltaToolCall[];
}

export interface V1DeltaToolCall {
  index: number;
  id?: string;
  type?: "function";
  function?: { name?: string; arguments?: string };
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
- `tools`\
  is the list of functions the model may call, each a `V1Tool`; omit to disable
  tool calling
- `tool_choice`\
  controls whether and which tool the model calls (a `V1ToolChoice`)
- `stream`\
  selects streaming mode when `true`; non-streaming when `false`, omitted, or
  `undefined`

The shared request fields are documented in
`specs/core/v1-generation-params.md`.

`V1Message` is a role-discriminated union; each variant carries only the fields
valid for its role:

- a `V1SystemMessage` (`role: "system"`) with a `content` string
- a `V1UserMessage` (`role: "user"`) with a `content` that is a string or an
  array of `V1ContentPart` (text, image, and audio parts), so a user turn can
  carry images or audio alongside text
- a `V1AssistantMessage` (`role: "assistant"`) with a `content` that is a string
  or `null` (null when the turn produced only tool calls) and an optional
  `tool_calls`; used to replay a prior assistant turn that called tools
- a `V1ToolMessage` (`role: "tool"`) carrying a tool result: a `tool_call_id`
  matching the call it answers and a `content` string

A `V1ContentPart` (an element of a `V1UserMessage` `content` array) is one of:

- a `V1TextPart` (`type: "text"`) with a `text` string
- a `V1ImagePart` (`type: "image_url"`) with an `image_url` carrying a `url` (an
  https URL or a base64 data URI) and an optional `detail` (`"auto"`, `"low"`,
  `"high"`, or `"original"`)
- a `V1AudioPart` (`type: "input_audio"`) with an `input_audio` carrying a
  base64-encoded `data` string and a `format` (`"wav"` or `"mp3"`)

Each `V1Tool` describes one callable function:

- a `type`, always `"function"`
- a `function` with a `name`, an optional `description`, and `parameters` (a
  JSON Schema object describing the arguments)

`V1ToolChoice` is one of `"auto"` (the model decides), `"none"` (never call a
tool), `"required"` (must call some tool), or
`{ type: "function"; function: { name } }` to force a specific function.

Each `V1ToolCall` (carried on an assistant message) has:

- an `id` used to correlate the matching `V1ToolMessage` result
- a `type`, always `"function"`
- a `function` with the `name` called and `arguments`, a JSON-encoded string of
  the arguments (the library does not parse it)

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
- a `message` (the assistant's reply, a `V1AssistantResponseMessage`)
- a `finish_reason` (`"stop"` when generation halted at a stop sequence or end
  of output, `"length"` when it halted at `max_tokens`, `"tool_calls"` when the
  model stopped to call one or more tools)

Each `V1AssistantResponseMessage` has:

- a `role`, always `"assistant"`
- a `content`, the reply text; `null` when the turn produced only tool calls,
  and may be an empty string when the model produced no reply text (for example,
  a reasoning model whose output was cut off during reasoning)
- an optional `reasoning_content`, the model's reasoning output; present for
  reasoning models, absent otherwise
- an optional `tool_calls`, the functions the model chose to call (a list of
  `V1ToolCall`); present when `finish_reason` is `"tool_calls"`

### Streaming chunk fields

Each `V1ChatCompletionsChunk` has the same top-level fields as
`V1ChatCompletionsResponse`, with `choices: V1ChatChunkChoice[]` instead of
`V1ChatChoice[]`, and `usage` optional (llama-server may include it on the final
chunk depending on configuration).

Each `V1ChatChunkChoice` has:

- an `index` with the same meaning as `V1ChatChoice`
- a `delta` (a `V1Delta`: the incremental piece of the assistant's reply)
- a `finish_reason` that is `null` while generation is in progress and becomes
  `"stop"`, `"length"`, or `"tool_calls"` on the final chunk

Each `V1Delta` has:

- an optional `role`, present only on the first chunk for a choice, always
  `"assistant"`
- an optional `content`, the reply text fragment for this chunk; may be `null`
  (the first chunk for a choice carries the `role` with `content: null` before
  any text is produced)
- an optional `reasoning_content`, the reasoning text fragment for this chunk;
  present for reasoning models
- an optional `tool_calls`, incremental tool-call fragments for this chunk (a
  list of `V1DeltaToolCall`); present when the model is calling tools

Each `V1DeltaToolCall` has:

- an `index` identifying which tool call in the assistant's reply the fragment
  belongs to (distinct from the choice `index`)
- an optional `id`, present on the first fragment for that tool call
- an optional `type`, always `"function"` when present
- an optional `function` with an optional `name` (present on the first fragment)
  and an optional `arguments` (a fragment of the JSON-encoded arguments string)

Consumers reconstruct the full reply by concatenating the non-null
`delta.content` values across chunks for each choice `index`, and the reasoning
trace by concatenating `delta.reasoning_content` the same way. Tool calls are
reconstructed per `tool_calls` `index`: take `id` and `function.name` from the
first fragment that provides them, and concatenate the `function.arguments`
fragments in order to form the complete JSON-encoded arguments string.

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
