# /health

A readiness check for the llama-server.

## Location

`src/llama/`

## TypeScript surface

```ts
export interface HealthResponse {
  status: string;
}
```

Called as

```
llama.health(
  options?: { signal?: AbortSignal },
): Promise<HealthResponse>
```

`status` is `"ok"` on a ready server. A not-ready server responds with HTTP 503
(surfaced as `LlamaHTTPError` per `request.md`), not a 200 body carrying a
different status, so a successful response's `status` is effectively always
`"ok"`. The `string` type is defensive.

## Request

`GET /health` with no body.

## Response

Parsed JSON as `HealthResponse`. Errors handled per `specs/core/request.md`.
