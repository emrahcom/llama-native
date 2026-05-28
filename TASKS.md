# Tasks

## T-001: Client implementation

Per `specs/core/client.md`.

status: done

- Added `src/client/mod.ts` with the `Llama` class and `ClientOptions`
  interface. Defaults `baseUrl` to `http://localhost:8080`, strips trailing
  slashes, leaves `apiKey` undefined when not provided, and freezes `config` so
  it cannot mutate after construction.
- Added `src/mod.ts` re-exporting `Llama` and `ClientOptions` as the module's
  public surface.

## T-002: Client tests

Per `specs/core/client.md`.

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

Per `specs/core/client.md`.

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

status: done

- Removed `export { Server } from "./server/mod.ts";` from `src/mod.ts`. The
  `/health` spec's TypeScript surface exposes only `HealthResponse` and accesses
  the sub-client through `llama.server.health()`, so `Server` need not be part
  of the public surface.
- `src/client/mod.ts` already imports `Server` directly from `../server/mod.ts`,
  so dropping the re-export does not affect construction of `Llama.server`.

## T-009: Implement errors module

Per `specs/core/errors.md`.

status: done

- Added `src/errors/mod.ts` with `LlamaError` and `LlamaHTTPError`. `LlamaError`
  extends `Error`, forwards `message` and `options` (so `cause` is preserved),
  and sets `this.name = "LlamaError"`. `LlamaHTTPError` extends `LlamaError`,
  adds the readonly `status` and optional readonly `body` fields, and sets
  `this.name = "LlamaHTTPError"`, matching the spec's TypeScript surface.
- Re-exported `LlamaError` and `LlamaHTTPError` from `src/mod.ts`; both are
  marked `export` in the spec so they belong on the public surface.

findings:

- The existing `server.health()` still throws a plain `Error` on non-2xx status.
  Switching it to throw `LlamaHTTPError` (with the spec's
  `HTTP {status} from {method} {path}` message) and wrapping network/parse
  failures in `LlamaError` is out of scope here and would be its own task,
  including updated `/health` tests.

## T-010: Tests for errors module

Per `specs/core/errors.md`.

status: done

- Added `tests/errors.test.ts` covering both classes against the spec's
  TypeScript surface. For `LlamaError`: it is an `instanceof Error` and
  `LlamaError`, forwards the `message`, sets `name` to `"LlamaError"`, and
  preserves `cause` passed via `options`. For `LlamaHTTPError`: it is an
  `instanceof Error`, `LlamaError`, and `LlamaHTTPError` (so a single
  `instanceof LlamaError` catches it), forwards the `message`, sets `name` to
  `"LlamaHTTPError"`, exposes `status`, exposes the `body` when provided, leaves
  `body` `undefined` when omitted, and preserves `cause` passed via `options`.
- Imports `LlamaError` and `LlamaHTTPError` through the `@emrahcom/llama-native`
  public surface, exercising the module as a consumer would.

## T-011: Switch `/health` to throw library error types

Per `specs/endpoints/health.md` and `specs/core/errors.md`. Includes updating
`tests/server.test.ts`.

status: done

- `src/server/mod.ts` now imports `LlamaError` and `LlamaHTTPError` from
  `../errors/mod.ts`. On a non-2xx response, `health()` throws a
  `LlamaHTTPError` with the spec's `HTTP {status} from GET /health` message, the
  response `status`, and a `body` read via a `readErrorBody` helper (parsed as
  JSON when possible, falling back to raw text, and `undefined` when the body
  cannot be read).
- Wrapped the `fetch` call so network failures throw a `LlamaError` with the
  original error attached via `cause`, while an `AbortError` (a `DOMException`
  named `"AbortError"`) is re-thrown unchanged so cancellation propagates as in
  plain fetch code.
- Wrapped `response.json()` so a JSON parse failure on a 200 response throws a
  `LlamaError` carrying the parse error as `cause`.
- Updated `tests/server.test.ts`: the non-2xx case now asserts a
  `LlamaHTTPError` with the expected message, `status`, and text `body`; a new
  case asserts a JSON error body is exposed; network errors assert a
  `LlamaError` whose `cause` is the original error; a new case asserts an
  `AbortError` propagates unchanged; and the JSON parse case asserts a
  `LlamaError`.

findings:

- `readErrorBody` will be needed by every endpoint that surfaces
  `LlamaHTTPError`. Once a second endpoint lands, lifting it (and the
  fetch/abort/parse error-handling shape in `health()`) into a shared request
  helper would avoid duplicating this logic per method.

## T-012: Implement the request helper

Per `specs/core/request.md`.

status: done

- Added `src/request/mod.ts` exporting the internal `RequestOptions` interface
  and `request` function. `request` builds `${config.baseUrl}${path}`,
  prepending a `/` when `path` does not start with one; adds
  `Authorization: Bearer ${apiKey}` when `config.apiKey` is set; when `body` is
  given, sets `Content-Type: application/json` and serializes the body with
  `JSON.stringify`; forwards `signal` to `fetch` when provided; and returns
  `await response.json()` as `unknown` on success.
- Error mapping follows the spec: `AbortError` from `fetch` propagates
  unchanged; other `fetch` rejections throw `LlamaError` with the original error
  as `cause` and message `{method} {path} request failed`; non-2xx responses
  throw `LlamaHTTPError` with message `HTTP {status} from {method} {path}`, the
  response `status`, and a body read as JSON if parseable, raw text otherwise,
  or `undefined` when the body cannot be read; a success response whose body
  fails JSON parsing throws `LlamaError` with the parse error as `cause` and
  message `Failed to parse {method} {path} response body`.
- Left `request` and `RequestOptions` out of `src/mod.ts` as the spec specifies;
  the helper is internal infrastructure.

findings:

- `src/server/mod.ts` still implements its own fetch/abort/parse error handling
  and a local `readErrorBody`. Migrating `server.health()` to call `request`
  (and dropping the duplicated helper) is a natural follow-up but belongs to its
  own task per the workflow rules, alongside any test updates it requires.
- Tests for `src/request/mod.ts` are not part of this task; per the precedent
  set by T-001/T-002 and T-003/T-006, request tests belong to their own task.

## T-013: Tests for the request helper

Per `specs/core/request.md`.

status: done

- Added `tests/request.test.ts` covering the `request` helper against the spec.
  Behavior cases: it sends `method` to `${baseUrl}${path}`, prepends a `/` when
  `path` does not start with one and leaves it unchanged when it does, omits
  `Authorization` when no `apiKey` and adds `Authorization: Bearer <key>` when
  set, sets `Content-Type: application/json` and serializes the body with
  `JSON.stringify` when `body` is given, omits both `Content-Type` and the
  request body when no `body` is given, forwards `signal` to `fetch` when
  provided, and returns the parsed JSON body on success.
- Error-mapping cases: an `AbortError` from `fetch` propagates unchanged; a
  non-`AbortError` fetch rejection is wrapped in `LlamaError` with the original
  error attached via `cause` and message `{method} {path} request failed`; a
  non-2xx response throws `LlamaHTTPError` with the message
  `HTTP {status} from {method} {path}` and the response `status`, exposing a
  JSON-parseable error body as the parsed value, a non-JSON body as the raw
  text, and leaving `body` `undefined` when the body cannot be read (a
  `ReadableStream` that errors on read); a success response with an unparseable
  JSON body throws `LlamaError` with the parse error as `cause` and message
  `Failed to parse {method} {path} response body`.
- Imports `LlamaError` and `LlamaHTTPError` through the public surface and
  imports the internal `request` and `Config` via relative paths into `src/`,
  since neither is re-exported from `src/mod.ts`.
- Reuses the `stubFetch`/`restoreFetch` pattern from `tests/server.test.ts`.

findings:

- The `stubFetch` / `restoreFetch` pair and `FetchHandler` type are now
  duplicated between `tests/request.test.ts` and `tests/server.test.ts`. Once a
  third endpoint adds tests, lifting them into a `tests/_fetch.ts` helper (with
  the `typeof globalThis.fetch` cast that the T-006 finding called out) would
  centralize the cast and reduce per-file boilerplate. That belongs to its own
  task.
- `src/server/mod.ts` still implements its own fetch/abort/parse error handling
  alongside the now well-tested `request` helper. Migrating `server.health()` to
  call `request` (and dropping the duplicated logic and the `server.test.ts`
  cases that overlap with `request.test.ts`) remains the follow-up noted in
  T-012's findings.

## T-014: Refactor /health to use the request helper

Per `specs/endpoints/health.md` and `specs/core/request.md`. Includes updating
`tests/server.test.ts` to drop cases that now overlap with
`tests/request.test.ts`.

status: done

- `src/server/mod.ts` now imports `request` from `../request/mod.ts` and
  delegates to it. `health()` is a single
  `await request({ config, method:
  "GET", path: "/health" })` call whose
  result is cast to `HealthResponse`. Dropped the local `readErrorBody` helper,
  the inline fetch/abort/parse error-handling, and the now-unused
  `LlamaError`/`LlamaHTTPError` imports; the only header-, auth-, and
  error-mapping logic now lives in `request`.
- Pruned `tests/server.test.ts` to the three cases that remain /health-
  specific: it issues `GET <baseUrl>/health`, returns the parsed JSON body on
  HTTP 200, and passes non-`"ok"` `status` strings through unchanged. Dropped
  the Authorization header, non-2xx `LlamaHTTPError`, JSON error body, network
  error, AbortError, and JSON parse cases — they are all exercised by
  `tests/request.test.ts` against `request` directly, where the behavior now
  lives. Removed the unused `assertInstanceOf`, `assertRejects`,
  `assertStrictEquals`, `LlamaError`, and `LlamaHTTPError` imports.

## T-015: Expose signal on Server.health

Per `specs/endpoints/health.md`. Includes adding an abort-case test to
`tests/server.test.ts`.

status: done

- `src/server/mod.ts`: `health()` now accepts an optional
  `{ signal?: AbortSignal }` argument matching the spec's call signature and
  forwards `options?.signal` to the `request` helper, which already handles
  forwarding to `fetch` and propagating `AbortError` unchanged per
  `specs/core/request.md`.
- `tests/server.test.ts`: added a case asserting
  `llama.server.health({ signal })` forwards the exact `AbortSignal` instance
  through to the underlying `fetch` call's `init.signal`. Existing
  /health-specific cases are unchanged.

## T-016: Implement Server.tokenize

Per `specs/endpoints/tokenize.md`.

status: done

- `src/server/mod.ts`: added the `TokenizeRequest` (`content: string`,
  `add_special?: boolean`) and `TokenizeResponse` (`tokens: number[]`)
  interfaces and a `tokenize(request, options?)` method on `Server`. The method
  delegates to the shared `request` helper as `POST /tokenize` with the
  `TokenizeRequest` as the JSON body and forwards `options?.signal`; the result
  is cast to `TokenizeResponse`. All wire fields use snake_case per
  `specs/conventions.md`; auth, error mapping, and abort handling come from
  `specs/core/request.md` unchanged.
- Renamed the `request` import to `sendRequest` in `src/server/mod.ts` so the
  new `tokenize(request, ...)` parameter can keep the name the spec uses in the
  call signature without shadowing the helper. Updated the existing `health()`
  call site to use the renamed import; no behavior change.
- `src/mod.ts`: re-exported `TokenizeRequest` and `TokenizeResponse` alongside
  `HealthResponse`, matching the conventions rule that names marked `export` in
  a spec belong on the public surface.

findings:

- No tests for `server.tokenize()` yet; per the precedent set by T-003/T-006 and
  reinforced by the workflow rules, tokenize tests belong to their own task.
- No `examples/tokenize.ts` yet; per the precedent set by T-003/T-007, the
  example belongs to its own task.
