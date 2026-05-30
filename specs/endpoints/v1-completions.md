# /v1/completions

Generates a text completion for a prompt. Supports both non-streaming (`Promise`
return) and streaming (`AsyncIterable` return) modes, selected by the `stream`
field of the request.

## Location

`src/v1/`

## TypeScript surface

```ts
export interface CompletionsRequest {
  prompt: string | string[] | number[] | number[][];
  model?: string;
  max_tokens?: number;
  stop?: string | string[];
  temperature?: number;
  stream?: boolean;
}

export interface CompletionsResponse {
  id: string;
  object: "text_completion";
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
  system_fingerprint?: string;
}

export interface Choice {
  index: number;
  text: string;
  logprobs: null;
  finish_reason: "stop" | "length";
}

export interface CompletionsChunk {
  id: string;
  object: "text_completion";
  created: number;
  model: string;
  choices: ChunkChoice[];
  usage?: Usage;
  system_fingerprint?: string;
}

export interface ChunkChoice {
  index: number;
  text: string;
  logprobs: null;
  finish_reason: "stop" | "length" | null;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
```

`Usage` is a shared v1 type defined in `src/types/v1.ts` (per the shared-types
rule in `specs/conventions.md`), not in `src/v1/`. It is shown here because the
completions response and chunk include it.

Called as

```
llama.v1.completions(
  request: CompletionsRequest & { stream: true },
  options?: { signal?: AbortSignal },
): AsyncIterable<CompletionsChunk>;

llama.v1.completions(
  request: CompletionsRequest & { stream?: false | undefined },
  options?: { signal?: AbortSignal },
): Promise<CompletionsResponse>;
```

The overload selected depends on the literal type of `request.stream`:

- `stream: true` selects the streaming overload, returning
  `AsyncIterable<CompletionsChunk>`
- `stream: false`, omitted, or `undefined` selects the non-streaming overload,
  returning `Promise<CompletionsResponse>`
- A `stream` value typed as `boolean` (not a literal) matches neither overload
  and produces a compile error; consumers in that case narrow the value before
  calling

### Request fields

- `prompt`\
  is the input to generate from; accepts:
  - a single string
  - an array of strings (batch)
  - an array of token IDs
  - an array of token ID arrays (batch over token sequences)
- `model`\
  is the model identifier; when omitted, llama-server uses its loaded model
- `max_tokens`\
  is the upper bound on tokens generated
- `stop`\
  is a single string or array of strings;\
  generation halts when any is produced
- `temperature`\
  is the sampling temperature
- `stream`
  - selects streaming mode when `true`
  - non-streaming when `false`, omitted, or `undefined`

Omitted optional fields use llama-server defaults.

### Non-streaming response fields

- `id`\
  is the request identifier assigned by the server
- `object`\
  is the discriminator (always `"text_completion"`)
- `created`\
  is the Unix-seconds timestamp
- `model`\
  is the model that generated the response
- `choices`\
  is the list of generated completions
- `usage`\
  is the token counts for the request
- `system_fingerprint`\
  is the server build identifier (optional)

Each `Choice` has:

- an `index` (position in the choices array)
- a `text` (the generated text)
- a `logprobs` field, always `null` in the current scope (request-side
  `logprobs` not yet supported)
- a `finish_reason` (`"stop"` when generation halted at a stop sequence or end
  of output, `"length"` when it halted at `max_tokens`)

Each `Usage` has:

- a `prompt_tokens` count (tokens in the input prompt)
- a `completion_tokens` count (tokens in the generated text)
- a `total_tokens` count (sum of the two)

### Streaming chunk fields

Each `CompletionsChunk` has the same top-level fields as `CompletionsResponse`,
with `choices: ChunkChoice[]` instead of `Choice[]`, and `usage` optional
(llama-server may include it on the final chunk depending on configuration).

Each `ChunkChoice` has:

- an `index`, `text`, and `logprobs` field with the same meaning as `Choice`
- a `finish_reason` that is `null` while generation is in progress and becomes
  `"stop"` or `"length"` on the final chunk

The `text` field on each chunk is a _delta_: the new text generated since the
previous chunk. Consumers reconstruct the full output by concatenating `text`
values across chunks for each `index`.

## Request

`POST /v1/completions` with `CompletionsRequest` as the JSON-serialized body.
Optional fields are omitted from the body when not provided.

When `stream: true` is set in the request body, llama-server responds with
Server-Sent Events. When `stream` is `false`, omitted, or `undefined`, it
responds with a single JSON document.

## Response

Non-streaming: parsed JSON as `CompletionsResponse`. Errors handled per
`specs/core/request.md`.

Streaming: an `AsyncIterable<CompletionsChunk>` produced by `requestStream` from
`specs/core/streaming.md`. Each iteration yields the next chunk parsed from an
SSE `data:` event. Errors handled per `specs/core/streaming.md`.
