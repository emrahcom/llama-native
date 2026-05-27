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

## T-004: Align implementation with updated client spec

Per `specs/client.md`.

status: done

- Added an exported `Config` interface to `src/client/mod.ts` and typed
  `Llama.config` as `Config` instead of an inline object type, matching the
  spec's named internal `Config`.
- Removed the duplicate `ServerConfig` interface from `src/server/mod.ts`; the
  `Server` sub-client now imports the shared `Config` via `import type` and uses
  it directly without re-declaring its type, as the spec requires.
- Left `Config` out of `src/mod.ts` so it stays internal to the package (the
  spec shows it without `export` in the public surface).

findings:

- The `import type { Config }` in `src/server/mod.ts` introduces a type-only
  cyclic import with `src/client/mod.ts`. It is erased at runtime so it is
  harmless, but if more sub-clients adopt `Config` a dedicated internal
  `config.ts` module might read more cleanly.

## T-005: Move Config type to dedicated module

Per `specs/conventions.md`.

status: done

- Added `src/types/config.ts` holding the shared internal `Config` interface,
  matching the `specs/conventions.md` rule that types used by more than one
  component live in `src/types/<name>.ts` (the spec names `config.ts` directly).
- Updated `src/client/mod.ts` to `import type { Config }` from
  `../types/config.ts` instead of declaring it locally.
- Updated `src/server/mod.ts` to import `Config` from `../types/config.ts`
  instead of `../client/mod.ts`, removing the type-only cyclic import between
  the client and server modules flagged in T-004's findings.

## T-006: /health tests

Per `specs/endpoints/health.md`.

status: done

- Added `tests/server.test.ts` covering `server.health()` against the `/health`
  spec: it issues `GET` to `<baseUrl>/health`, returns the parsed JSON body on
  HTTP 200, passes through non-`"ok"` status strings, omits the `Authorization`
  header when no `apiKey` is set and adds `Authorization: Bearer <key>` when it
  is, and throws on a non-2xx status, a propagated network error, and a JSON
  parse failure.
- Tests stub `globalThis.fetch` with a typed `FetchHandler` and restore the
  original in a `finally` block so each case is isolated.

findings:

- The handler type is cast to `typeof globalThis.fetch` on assignment because
  Deno types `fetch` as an overload union, which makes `init.method`/
  `init.headers` non-narrowable. A shared test helper for stubbing `fetch` could
  absorb this cast once more endpoints add tests.

## T-007: /health example

Per `specs/endpoints/health.md`.

status: done

- Added `examples/health.ts`, the first entry in the `examples/` directory. It
  constructs a `Llama` client and calls `server.health()`, printing the returned
  `status`. `baseUrl` and `apiKey` are read from `LLAMA_BASE_URL` and
  `LLAMA_API_KEY` so the example runs against the default
  `http://localhost:8080` with no arguments and can be pointed at an
  authenticated server via environment variables.
- Imports the public surface through the `@emrahcom/llama-native` import-map
  entry rather than a relative path, exercising the module as a consumer would.

findings:

- `examples/` is included in the published package (the `deno publish` file list
  shows `examples/health.ts`). If examples should ship separately from the
  module, adding `examples` to `publish.exclude` in `deno.json` would be its own
  task.

## T-008: Drop Server export from src/mod.ts

Per `specs/endpoints/health.md`.
