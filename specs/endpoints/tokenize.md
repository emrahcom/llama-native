# /tokenize

Tokenizes input text into model token IDs.

## Location

`src/server/`

## TypeScript surface

```ts
export interface TokenizeRequest {
  content: string;
  add_special?: boolean;
}

export interface TokenizeResponse {
  tokens: number[];
}
```

Called as

```
llama.server.tokenize(request: TokenizeRequest): Promise<TokenizeResponse>
```

`content` is the input text. `add_special` (default `false`) controls whether
the model's special tokens like BOS/EOS are prepended. `tokens` is the resulting
list of model token IDs.

## Request

`POST /tokenize` with `TokenizeRequest` as the JSON-serialized body.

## Response

Parsed JSON as `TokenizeResponse`. Errors handled per `specs/core/request.md`.
