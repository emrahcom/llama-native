# /tokenize

Tokenizes input text into model token IDs.

## Location

`src/llama/`

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
llama.tokenize(
  request: TokenizeRequest,
  options?: { signal?: AbortSignal },
): Promise<TokenizeResponse>
```

- `content`\
  is the input text
- `add_special`\
  controls whether the model's special tokens (such as a leading BOS) are added
- `tokens`\
  is the resulting list of model token IDs

Omitted optional fields use llama-server defaults.

## Request

`POST /tokenize` with `TokenizeRequest` as the JSON-serialized body.

## Response

Parsed JSON as `TokenizeResponse`. Errors handled per `specs/core/request.md`.
