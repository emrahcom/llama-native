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
llama.server.health(): Promise<HealthResponse>
```

`status` is typically `"ok"` but other strings are possible depending on server
state.

## Request

`GET /health`

- No body.
- Standard headers.
- When `apiKey` is set on the client, adds `Authorization: Bearer <key>`.

## Response

- On HTTP 200\
  the body is parsed as JSON and returned as a `HealthResponse`.

- On any non-2xx status, network error, or JSON parse error\
  the method throws.
