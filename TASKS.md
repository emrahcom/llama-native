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
