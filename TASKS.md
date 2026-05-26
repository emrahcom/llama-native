# Tasks

## T-001: Client implementation

Per `specs/client.md`.

status: done

- Added `src/client/mod.ts` with the `Llama` class and `ClientOptions`
  interface. Defaults `baseUrl` to `http://localhost:8080`, strips trailing
  slashes, leaves `apiKey` undefined when not provided, and freezes `config` so
  it cannot mutate after construction.
- Added `src/mod.ts` re-exporting `Llama` and `ClientOptions` as the module's
  public surface.

## T-002: Client tests

Per `specs/client.md`.

status: done

- Added `tests/client.test.ts` covering the `Llama` constructor behavior defined
  in the spec: `baseUrl` default for missing/undefined/falsy options, trailing
  slash normalization (single and multiple), `baseUrl` left as-is when it has no
  trailing slash, `apiKey` undefined by default and preserved when provided, and
  `config` being frozen after construction.

## T-003: /health implementation

Per `specs/endpoints/health.md`.

status: done

- Added `src/server/mod.ts` with the `HealthResponse` interface and a `Server`
  sub-client. `health()` issues `GET /health`, adds an
  `Authorization: Bearer <key>` header when `apiKey` is set, returns the parsed
  JSON body on HTTP 200, and throws on non-2xx status (network and JSON parse
  errors propagate from `fetch`/`response.json()`).
- Wired the `Server` sub-client onto `Llama` as the readonly `server` property,
  constructed with the frozen client config.
- Re-exported `Server` and `HealthResponse` from `src/mod.ts`.

findings:

- The `/health` spec mentions "Standard headers" without defining them; only
  `Authorization` is added explicitly here. A shared request-headers convention
  may be worth a foundation spec once more endpoints land.
- No tests for `server.health()` yet; per the workflow rules that is its own
  task (cf. T-002 covering the client).
