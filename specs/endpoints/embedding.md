# /embedding

Generates embedding vectors for one or more inputs using llama-server's native
API. Each vector represents the meaning of its input as a list of floats,
suitable for semantic search, retrieval, clustering, and similar tasks.

This is a native API family endpoint. Per the API-families rule in
`specs/conventions.md`, its types are isolated from the `/v1` family and carry
no prefix; the field names coincide with the `/v1/embeddings` types only where
the server defines them identically, not because the types are shared.

## Location

`src/llama/`

This endpoint adds an `embedding` method to `Llama`, beside `health`,
`tokenize`, and `completion`. All types below are specific to this endpoint and
live in `src/llama/mod.ts`.

## Server requirements

This endpoint requires llama-server to be started with `--embedding`. The
`--pooling` type chosen at launch shapes the output: `--pooling none` yields one
vector per token of each input, while a pooling type such as `--pooling mean`
yields a single pooled vector per input. Both are accepted; unlike
`/v1/embeddings`, this endpoint does not require a non-`none` pooling type, and
`embedding` is a two-dimensional array (one inner vector per token, or a single
inner vector when pooled) in either case.

## TypeScript surface

```ts
export interface EmbeddingRequest {
  content: string | string[];
}

export type EmbeddingResponse = Embedding[];

export interface Embedding {
  index: number;
  embedding: number[][];
}
```

Called as

```
llama.embedding(
  request: EmbeddingRequest,
  options?: { signal?: AbortSignal },
): Promise<EmbeddingResponse>
```

Embeddings are not streamed: a single request returns a single response, so this
endpoint has no `stream` field and no streaming overload.

### Request fields

- `content`\
  is the input to embed: a single string, or an array of strings to embed in one
  request (a batch). Each input produces one entry in the response.

Omitted optional fields use llama-server defaults.

The server accepts additional inputs not modeled in the current scope (for
example token-ID array forms of `content`). They are intentionally omitted until
a need shows up; this is a stated deviation per the wire-types rule in
`specs/conventions.md`.

### Response fields

The response is a JSON array of `Embedding` entries, one per input, not an
object wrapper. It carries no `object`, `model`, or `usage` fields.

Each `Embedding` has:

- an `index` (position matching the order of `content`)
- an `embedding` (a two-dimensional array of floats). Under `--pooling none`
  each inner array is the vector for one token of the input, in order; under a
  pooling type such as `--pooling mean` there is a single inner array, the
  pooled vector for the input. See the Server requirements section.

## Request

`POST /embedding` with `EmbeddingRequest` as the JSON-serialized body. Optional
fields are omitted from the body when not provided.

## Response

Parsed JSON as `EmbeddingResponse`. Errors handled per `specs/core/request.md`.
