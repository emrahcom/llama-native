# /health

A readiness check for the llama-server.

## Location

`src/server/`

## TypeScript surface

```ts
export interface HealthResponse {
  status: string;
}
```

Called as

```
llama.server.health(
  options?: { signal?: AbortSignal },
): Promise<HealthResponse>
```

`status` is typically `"ok"` but other strings are possible depending on server
state.

## Request

`GET /health` with no body.

## Response

Parsed JSON as `HealthResponse`. Errors handled per `specs/core/request.md`.
