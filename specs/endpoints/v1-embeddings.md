# /v1/embeddings

Generates embedding vectors for one or more input texts. Each vector represents
the meaning of its input as a list of floats, suitable for semantic search,
retrieval, clustering, and similar tasks.

## Location

`src/v1/`

This endpoint adds an `embeddings` method to the existing `V1` sub-group,
accessed as `llama.v1.embeddings`. All types below are specific to this endpoint
and live in `src/v1/mod.ts`.

## Server requirements

This endpoint requires llama-server to be started with two launch flags, both
mandatory:

- `--embedding`, which enables the embeddings endpoint, and
- `--pooling` set to a type other than `none`, which produces one pooled vector
  per input. `mean` is a safe choice (`--pooling mean`).

A full launch therefore includes both: `--embedding --pooling mean`. The
`--pooling` flag is not optional here; with pooling type `none` the server
produces unpooled, per-token output that is not OpenAI-compatible and rejects
the request with HTTP 400 (message `Pooling type 'none' is not OAI compatible`),
surfaced as `LlamaHTTPError` per `specs/core/request.md`.

## TypeScript surface

```ts
export interface V1EmbeddingsRequest {
  input: string | string[];
  model?: string;
}

export interface V1EmbeddingsResponse {
  object: "list";
  data: V1Embedding[];
  model: string;
  usage: V1EmbeddingsUsage;
}

export interface V1Embedding {
  object: "embedding";
  index: number;
  embedding: number[];
}

export interface V1EmbeddingsUsage {
  prompt_tokens: number;
  total_tokens: number;
}
```

`V1EmbeddingsUsage` is specific to this endpoint and is not the shared `V1Usage`
type from `src/types/v1.ts`. The embeddings response reports only
`prompt_tokens` and `total_tokens`; it has no `completion_tokens` (nothing is
generated) and no `prompt_tokens_details`. Per the "type to what each context
can reach" rule in `specs/conventions.md`, this context gets its own usage type
rather than widening or reusing `V1Usage`.

Called as

```
llama.v1.embeddings(
  request: V1EmbeddingsRequest,
  options?: { signal?: AbortSignal },
): Promise<V1EmbeddingsResponse>
```

Embeddings are not streamed: a single request returns a single response, so this
endpoint has no `stream` field and no streaming overload.

### Request fields

- `input`\
  is the text to embed: a single string, or an array of strings to embed in one
  request (a batch). Each input produces one vector.
- `model`\
  is the model identifier; when omitted, llama-server uses its loaded model.

Omitted optional fields use llama-server defaults.

The server accepts additional inputs not modeled in the current scope: token-ID
array forms of `input`, the `encoding_format` parameter (whose `"base64"` value
returns each `embedding` as a base64 string instead of `number[]`), and
`dimensions`. They are intentionally omitted until a need shows up; with
`encoding_format` left unset the server defaults to `"float"`, so each
`embedding` is a `number[]`. This is a stated deviation per the wire-types rule
in `specs/conventions.md`.

### Response fields

- `object`\
  is the discriminator (always `"list"`)
- `data`\
  is the list of generated embeddings, one entry per input
- `model`\
  is the model that produced the embeddings
- `usage`\
  is the token counts for the request

Each `V1Embedding` has:

- an `object` discriminator (always `"embedding"`)
- an `index` (position in the `data` array, matching the order of `input`)
- an `embedding` (the vector: a list of floats)

Each `V1EmbeddingsUsage` has:

- a `prompt_tokens` count (tokens in the input)
- a `total_tokens` count (equal to `prompt_tokens`, since nothing is generated)

## Request

`POST /v1/embeddings` with `V1EmbeddingsRequest` as the JSON-serialized body.
Optional fields are omitted from the body when not provided.

## Response

Parsed JSON as `V1EmbeddingsResponse`. Errors handled per
`specs/core/request.md`.
