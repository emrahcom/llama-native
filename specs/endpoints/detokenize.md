# /detokenize

Converts a list of model token IDs back into text. The inverse of `/tokenize`.

## Location

`src/llama/`

This endpoint adds a `detokenize` method to `Llama`, beside `tokenize`. All
types below are specific to this endpoint and live in `src/llama/mod.ts`.

## TypeScript surface

```ts
export interface DetokenizeRequest {
  tokens: number[];
}

export interface DetokenizeResponse {
  content: string;
}
```

Called as

```
llama.detokenize(
  request: DetokenizeRequest,
  options?: { signal?: AbortSignal },
): Promise<DetokenizeResponse>
```

- `tokens`\
  is the list of model token IDs to convert back to text
- `content`\
  is the resulting text

## Request

`POST /detokenize` with `DetokenizeRequest` as the JSON-serialized body.

## Response

Parsed JSON as `DetokenizeResponse`. Errors handled per `specs/core/request.md`.
