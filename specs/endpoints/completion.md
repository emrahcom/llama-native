# /completion

Generates a text completion for a prompt using llama-server's native API.
Supports both non-streaming (`Promise` return) and streaming (`AsyncIterable`
return) modes, selected by the `stream` field of the request.

This is the first endpoint of the native API family. Per the API-families rule
in `specs/conventions.md`, its types are isolated from the `/v1` family and
carry no prefix; the sampling fields coincide in name with `V1GenerationParams`
because the server defines them identically, not because the types are shared.

## Location

`src/llama/`

This endpoint adds a `completion` method to `Llama`, beside `health` and
`tokenize`. All types below are specific to this endpoint and live in
`src/llama/mod.ts`.

## TypeScript surface

```ts
export interface CompletionRequest {
  prompt: string | (string | number)[];
  n_predict?: number;
  stop?: string[];
  temperature?: number;
  top_k?: number;
  top_p?: number;
  min_p?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  repeat_penalty?: number;
  seed?: number;
  grammar?: string;
  json_schema?: Record<string, unknown>;
  cache_prompt?: boolean;
  stream?: boolean;
}

export interface CompletionResponse {
  content: string;
  stop: true;
  model: string;
  stop_type: "none" | "eos" | "word" | "limit";
  stopping_word: string;
  tokens_predicted: number;
  tokens_evaluated: number;
  tokens_cached: number;
  truncated: boolean;
  timings: Timings;
}

export interface CompletionChunk {
  content: string;
  stop: boolean;
  model?: string;
  stop_type?: "none" | "eos" | "word" | "limit";
  stopping_word?: string;
  tokens_predicted?: number;
  tokens_evaluated?: number;
  tokens_cached?: number;
  truncated?: boolean;
  timings?: Timings;
}

export interface Timings {
  prompt_n: number;
  prompt_ms: number;
  prompt_per_token_ms: number;
  prompt_per_second: number;
  predicted_n: number;
  predicted_ms: number;
  predicted_per_token_ms: number;
  predicted_per_second: number;
}
```

Called as

```
llama.completion(
  request: CompletionRequest & { stream: true },
  options?: { signal?: AbortSignal },
): AsyncIterable<CompletionChunk>;

llama.completion(
  request: CompletionRequest & { stream?: false | undefined },
  options?: { signal?: AbortSignal },
): Promise<CompletionResponse>;
```

The overload selected depends on the literal type of `request.stream`:

- `stream: true` selects the streaming overload, returning
  `AsyncIterable<CompletionChunk>`
- `stream: false`, omitted, or `undefined` selects the non-streaming overload,
  returning `Promise<CompletionResponse>`
- A `stream` value typed as `boolean` (not a literal) matches neither overload
  and produces a compile error; consumers in that case narrow the value before
  calling

### Request fields

- `prompt`\
  is the input to generate from: a single string, or an array whose elements are
  text segments (strings) and token IDs (numbers) that the server assembles into
  one prompt. Unlike `/v1/completions`, the array form is one prompt built from
  pieces, not a batch.
- `n_predict`\
  is the maximum number of tokens to predict; -1 means unlimited
- `stop`\
  is an array of stop strings; generation halts before producing any of them.
  This endpoint accepts only the array form.
- `temperature`\
  is the sampling temperature; higher is more random, lower is more
  deterministic
- `top_k`\
  is top-k sampling: considers only the k most probable tokens. Lower values
  make output more focused, higher values more diverse.
- `top_p`\
  is nucleus (top-p) sampling: considers the smallest set of tokens whose
  cumulative probability reaches this value. Lower values make output more
  focused.
- `min_p`\
  is min-p sampling: discards tokens less probable than this fraction of the
  most probable token's probability. Higher values make output more focused.
- `presence_penalty`\
  penalizes tokens that have already appeared at all, regardless of count,
  encouraging new topics. Higher values reduce repetition.
- `frequency_penalty`\
  penalizes tokens in proportion to how often they have already appeared. Higher
  values reduce repetition.
- `repeat_penalty`\
  is a multiplicative penalty on recently repeated tokens. Values above 1 reduce
  repetition; 1 applies no penalty.
- `seed`\
  is the random seed for the sampler. Set a fixed value for reproducible output
  across requests with identical parameters.
- `grammar`\
  is a GBNF grammar; generation is constrained to strings the grammar accepts
- `json_schema`\
  is a JSON Schema object; the server converts it to a grammar and constrains
  output to JSON matching the schema
- `cache_prompt`\
  reuses the server's KV cache for the prefix shared with the previous request,
  so only the unseen suffix is evaluated. Cache reuse can make output
  nondeterministic across runs; disable it for determinism.
- `stream`\
  selects streaming mode when `true`; non-streaming when `false`, omitted, or
  `undefined`

Omitted optional fields use llama-server defaults.

### Non-streaming response fields

- `content`\
  is the generated text
- `stop`\
  is always `true`: a finished generation is the only thing the server returns
  here, so the type is the literal
- `model`\
  is the model alias reported by the server
- `stop_type`\
  is why generation stopped: `"eos"` (the model produced its end-of-sequence
  token), `"word"` (a stop string was produced), `"limit"` (the `n_predict`
  limit was reached). `"none"` is in the union because the server defines it,
  though a finished generation reports one of the other three.
- `stopping_word`\
  is the stop string that ended generation, or `""` when generation did not stop
  on a stop string
- `tokens_predicted`\
  is the number of tokens generated
- `tokens_evaluated`\
  is the number of prompt tokens evaluated
- `tokens_cached`\
  is the number of prompt tokens reused from the KV cache (see `cache_prompt`)
- `truncated`\
  indicates the context size was exceeded during generation
- `timings`\
  is the performance measurement for the request

Each `Timings` has:

- a `prompt_n` (prompt tokens processed), `prompt_ms` (total prompt processing
  time), `prompt_per_token_ms`, and `prompt_per_second`
- a `predicted_n` (tokens generated), `predicted_ms` (total generation time),
  `predicted_per_token_ms`, and `predicted_per_second`

The server returns additional response fields not modeled in the current scope:
`generation_settings`, the processed `prompt`, `id_slot`, `tokens`, and
`has_new_line`. They are intentionally omitted until a need shows up; this is a
stated deviation per the wire-types rule in `specs/conventions.md`.

### Streaming chunk fields

Each `CompletionChunk` carries a `content` delta and a `stop` flag. While
generation is in progress, `stop` is `false` and only the delta fields are
present. The final chunk has `stop: true` and carries the completion fields
(every field other than `content` and `stop`), which is why those fields are
optional on the chunk type.

Consumers reconstruct the full output by concatenating `content` across chunks.

Native streams do not send the OpenAI-style `[DONE]` sentinel; the stream ends
after the `stop: true` chunk, per the native termination mode in
`specs/core/streaming.md`.

## Request

`POST /completion` with `CompletionRequest` as the JSON-serialized body.
Optional fields are omitted from the body when not provided.

When `stream: true` is set in the request body, llama-server responds with
Server-Sent Events. When `stream` is `false`, omitted, or `undefined`, it
responds with a single JSON document.

## Response

Non-streaming: parsed JSON as `CompletionResponse`. Errors handled per
`specs/core/request.md`.

Streaming: an `AsyncIterable<CompletionChunk>` produced by `requestStream` from
`specs/core/streaming.md` in the native termination mode. Each iteration yields
the next chunk parsed from an SSE `data:` event. Errors handled per
`specs/core/streaming.md`.
