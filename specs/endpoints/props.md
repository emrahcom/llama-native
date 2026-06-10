# /props

Reports server properties.

## Location

`src/llama/`

This endpoint adds a `props` method to `Llama`, beside `health`, `tokenize`,
`detokenize`, `completion`, and `embedding`. All types below are specific to
this endpoint and live in `src/llama/mod.ts`.

## TypeScript surface

```ts
export interface PropsResponse {
  media_marker: string;
}
```

Called as

```
llama.props(
  options?: { signal?: AbortSignal },
): Promise<PropsResponse>
```

- `media_marker`\
  is the server's media placeholder string: the marker that stands in for one
  media item within a multimodal prompt.

The server returns additional properties not modeled in the current scope (for
example `default_generation_settings`, `total_slots`, `model_path`,
`chat_template`, `modalities`, `build_info`, and `is_sleeping`). They are
intentionally omitted; this is a stated deviation per the wire-types rule in
`specs/conventions.md`.

## Request

`GET /props` with no body.

## Response

Parsed JSON as `PropsResponse`. Errors handled per `specs/core/request.md`.
