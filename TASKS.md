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

## T-017: Tests for Server.tokenize

Per `specs/endpoints/tokenize.md`.

status: done

- Added `tokenize` cases to `tests/server.test.ts` covering the /tokenize-
  specific surface from `specs/endpoints/tokenize.md`: it issues
  `POST <baseUrl>/tokenize`, serializes the `TokenizeRequest` as the JSON body
  preserving the snake_case `add_special` field when provided, omits
  `add_special` from the body when not provided (so the optional field is not
  forced onto the wire as `undefined`), returns the parsed JSON body as
  `TokenizeResponse` on HTTP 200, and forwards the `signal` option to the
  underlying `fetch` call.
- Followed the precedent established by T-014: shared HTTP behavior (auth, error
  mapping, abort propagation, JSON parse failures) is exercised in
  `tests/request.test.ts` against the `request` helper directly and is not
  duplicated here.
- Reused the `stubFetch`/`restoreFetch` pattern already present in
  `tests/server.test.ts`; no new helpers or imports were needed.

findings:

- No `examples/tokenize.ts` yet; per the precedent set by T-003/T-007 and noted
  in T-016's findings, the example belongs to its own task.
- The `stubFetch` / `restoreFetch` / `FetchHandler` trio is now duplicated in
  both `tests/server.test.ts` and `tests/request.test.ts`. Lifting it into a
  shared `tests/_fetch.ts` helper remains the follow-up flagged in T-013's
  findings.

## T-018: Example for /tokenize

Per `specs/conventions.md` Examples section.

status: done

- Added `examples/tokenize.ts`, named per the Examples convention (`/tokenize` →
  `examples/tokenize.ts`). It constructs a `Llama` client and calls
  `server.tokenize()` with a sample `content` and `add_special: true`, then
  prints the returned `tokens` array. `baseUrl` and `apiKey` are read from
  `LLAMA_BASE_URL` and `LLAMA_API_KEY` so the example runs against the default
  `http://localhost:8080` with no arguments and can be pointed at an
  authenticated server via environment variables, matching the pattern set by
  `examples/health.ts`.
- Imports the public surface through the `@emrahcom/llama-native` import-map
  entry rather than a relative path, exercising the module as a consumer would.

## T-019: Move health and tokenize from Server to Llama

Per updated `specs/core/client.md`, `specs/endpoints/health.md`, and
`specs/endpoints/tokenize.md`. Includes dissolving the `Server` class, moving
`health` and `tokenize` to `Llama`, relocating tests from `tests/server.test.ts`
into `tests/client.test.ts`, and updating `examples/`.

status: done

- `src/client/mod.ts`: the `Llama` class now exposes `health()` and `tokenize()`
  directly, matching the updated specs whose endpoint-access rule makes
  single-segment paths (`/health`, `/tokenize`) methods on `Llama`. Both methods
  delegate to the shared `request` helper exactly as before, using `this.config`
  instead of the dissolved sub-client's `#config`. Moved the `HealthResponse`,
  `TokenizeRequest`, and `TokenizeResponse` interfaces here. Kept the
  `request as sendRequest` import alias so `tokenize`'s `request` parameter does
  not shadow the helper.
- Deleted `src/server/mod.ts` (the `Server` class and its readonly `server`
  property on `Llama`); the `Server` sub-client no longer exists.
- `src/mod.ts`: the `HealthResponse`, `TokenizeRequest`, and `TokenizeResponse`
  type re-exports now come from `./client/mod.ts` instead of `./server/mod.ts`.
- Relocated all fetch-stubbed `health`/`tokenize` cases from
  `tests/server.test.ts` into `tests/client.test.ts` (alongside the existing
  constructor cases) and deleted `tests/server.test.ts`. Call sites updated from
  `llama.server.health()`/`llama.server.tokenize()` to `llama.health()`/
  `llama.tokenize()`; assertions are otherwise unchanged.
- `examples/health.ts` and `examples/tokenize.ts`: updated the calls to
  `llama.health()` and `llama.tokenize()`.

findings:

- The `stubFetch`/`restoreFetch`/`FetchHandler` trio is now duplicated between
  `tests/client.test.ts` and `tests/request.test.ts`. Lifting it into a shared
  `tests/_fetch.ts` helper remains the follow-up flagged in T-013's findings.

## T-020: Rename client to llama

Rename `specs/core/client.md` → `specs/core/llama.md`, `src/client/` →
`src/llama/`, and `tests/client.test.ts` → `tests/llama.test.ts`. Update the
spec title from `# Client` to `# Llama`. Update all internal imports. Update the
`Location` lines in `specs/endpoints/health.md` and
`specs/endpoints/tokenize.md` from `src/client/` to `src/llama/`.

status: done

- Renamed `specs/core/client.md` → `specs/core/llama.md` (via `git mv`) and
  updated its title from `# Client` to `# Llama` and its `Location` from
  `src/client/` to `src/llama/`.
- Renamed `src/client/` → `src/llama/` and `tests/client.test.ts` →
  `tests/llama.test.ts` (via `git mv`). `src/llama/mod.ts` only imports siblings
  via `../` paths, so no internal import edits were needed there.
- Updated `src/mod.ts`'s two re-exports from `./client/mod.ts` to
  `./llama/mod.ts`.
- Updated the `Location` lines in `specs/endpoints/health.md` and
  `specs/endpoints/tokenize.md` from `src/client/` to `src/llama/`.

findings:

- Remaining `client` references elsewhere are out of scope and left as-is:
  `README.md` and `CLAUDE.md` describe the module as a "client", and
  `specs/conventions.md` / `specs/core/llama.md` use "sub-client" and
  "client-only types" as domain terminology rather than file/path references.

## T-021: Implement /v1/models

Per `specs/endpoints/v1-models.md` and `specs/core/llama.md`.

status: done

- Added `src/v1/mod.ts` with the `Model` and `ModelsResponse` interfaces and the
  `V1` sub-group class. `V1` holds the parent's frozen `Config` in a private
  `#config` field and exposes `models(options?)`, which delegates to the shared
  `request` helper as `GET /v1/models` with no body, forwards `options?.signal`,
  and casts the result to `ModelsResponse`. All response fields use snake_case
  (`owned_by`) per `specs/conventions.md`; auth, error mapping, and abort
  handling come from `specs/core/request.md` unchanged.
- `src/llama/mod.ts`: added the readonly `v1` property to `Llama`, constructed
  with `this.config` (the frozen `Config`) per the sub-group rule in
  `specs/core/llama.md`. `/v1/models` is a two-segment path, so `models` lives
  on the `v1` sub-group rather than directly on `Llama`.
- `src/mod.ts`: re-exported `Model` and `ModelsResponse` as types. The `V1`
  class is not marked `export` in the spec's surface (it is reached through
  `llama.v1`), so it stays internal, matching how the dissolved `Server`
  sub-client was handled.

findings:

- No tests for `llama.v1.models()` yet; per the precedent set by T-016/T-017,
  v1-models tests belong to their own task.
- No `examples/v1-models.ts` yet; per the precedent set by T-017/T-018 and the
  Examples convention (`/v1/models` → `examples/v1-models.ts`), the example
  belongs to its own task.

## T-022: Tests for v1.models

Per `specs/endpoints/v1-models.md`.

status: done

- Added `v1.models` cases to `tests/llama.test.ts` covering the /v1/models-
  specific surface from `specs/endpoints/v1-models.md`: it issues
  `GET <baseUrl>/v1/models` with no request body, returns the parsed JSON body
  as `ModelsResponse` on HTTP 200 (a populated `data` list with a fully-formed
  `Model`), and forwards the `signal` option to the underlying `fetch` call.
- Followed the precedent established by T-014/T-017: shared HTTP behavior (auth,
  error mapping, abort propagation, JSON parse failures) is exercised in
  `tests/request.test.ts` against the `request` helper directly and is not
  duplicated here.
- Reused the `stubFetch`/`restoreFetch` pattern already present in
  `tests/llama.test.ts`; no new helpers or imports were needed.

findings:

- No `examples/v1-models.ts` yet; per the precedent set by T-017/T-018 and the
  Examples convention (`/v1/models` → `examples/v1-models.ts`), the example
  belongs to its own task (already flagged in T-021's findings).
- The `stubFetch`/`restoreFetch`/`FetchHandler` trio remains duplicated between
  `tests/llama.test.ts` and `tests/request.test.ts`. Lifting it into a shared
  `tests/_fetch.ts` helper remains the follow-up flagged in T-013's findings.

## T-023: Example for v1.models

Per `specs/endpoints/v1-models.md` and the Examples convention in
`specs/conventions.md`.

status: done

- Added `examples/v1-models.ts`, named per the Examples convention (`/v1/models`
  → `examples/v1-models.ts`). It constructs a `Llama` client and calls
  `llama.v1.models()`, then prints each returned model's `id`. `baseUrl` and
  `apiKey` are read from `LLAMA_BASE_URL` and `LLAMA_API_KEY` so the example
  runs against the default `http://localhost:8080` with no arguments and can be
  pointed at an authenticated server via environment variables, matching the
  pattern set by `examples/health.ts` and `examples/tokenize.ts`.
- Imports the public surface through the `@emrahcom/llama-native` import-map
  entry rather than a relative path, exercising the module as a consumer would.

## T-024: Implement /v1/completions

Per `specs/endpoints/v1-completions.md`.

status: done

- `src/v1/mod.ts`: added the `CompletionsRequest`, `CompletionsResponse`,
  `Choice`, and `Usage` interfaces (in the spec's surface order) and a
  `completions(request, options?)` method on the `V1` sub-group. The method
  delegates to the shared `request` helper as `POST /v1/completions` with the
  `CompletionsRequest` as the JSON body and forwards `options?.signal`; the
  result is cast to `CompletionsResponse`. `/v1/completions` is a two-segment
  path, so it lives on the `v1` sub-group alongside `models`. All wire fields
  use snake_case (`max_tokens`, `prompt_tokens`, `finish_reason`,
  `system_fingerprint`) per `specs/conventions.md`; auth, error mapping, and
  abort handling come from `specs/core/request.md` unchanged.
- Renamed the `request` import to `sendRequest` in `src/v1/mod.ts` (matching the
  alias already used in `src/llama/mod.ts`) so the new `completions(request, …)`
  parameter does not shadow the helper. Updated the existing `models()` call
  site to the renamed import; no behavior change.
- `src/mod.ts`: re-exported `CompletionsRequest`, `CompletionsResponse`,
  `Choice`, and `Usage` as types alongside `Model`/`ModelsResponse`, matching
  the conventions rule that names marked `export` in a spec belong on the public
  surface.

findings:

- No tests for `llama.v1.completions()` yet; per the precedent set by
  T-021/T-022, v1-completions tests belong to their own task.
- No `examples/v1-completions.ts` yet; per the precedent set by T-022/T-023 and
  the Examples convention (`/v1/completions` → `examples/v1-completions.ts`),
  the example belongs to its own task.

## T-025: Tests for v1.completions

Per `specs/endpoints/v1-completions.md`.

status: done

- Added `v1.completions` cases to `tests/llama.test.ts` covering the
  /v1/completions-specific surface from `specs/endpoints/v1-completions.md`: it
  issues `POST <baseUrl>/v1/completions`, serializes the `CompletionsRequest` as
  the JSON body preserving the snake_case optional fields (`max_tokens`, plus
  `model`/`stop`/`temperature`) when provided, omits the optional fields from
  the body when not provided (so they are not forced onto the wire as
  `undefined`), returns the parsed JSON body as `CompletionsResponse` on HTTP
  200 (a fully-formed response including a `Choice`, `Usage`, and
  `system_fingerprint`), and forwards the `signal` option to the underlying
  `fetch` call.
- Followed the precedent established by T-014/T-017/T-022: shared HTTP behavior
  (auth, error mapping, abort propagation, JSON parse failures) is exercised in
  `tests/request.test.ts` against the `request` helper directly and is not
  duplicated here.
- Imported `CompletionsResponse` as a type alongside `Llama` from the public
  surface to annotate the HTTP-200 case's expected payload, so the response
  literal's `object`/`finish_reason` fields keep their narrow types for
  `assertEquals`. Reused the existing `stubFetch`/`restoreFetch` pattern; no new
  helpers were needed.

findings:

- No `examples/v1-completions.ts` yet; per the precedent set by T-022/T-023 and
  the Examples convention (`/v1/completions` → `examples/v1-completions.ts`),
  the example belongs to its own task (already flagged in T-024's findings).
- The `stubFetch`/`restoreFetch`/`FetchHandler` trio remains duplicated between
  `tests/llama.test.ts` and `tests/request.test.ts`. Lifting it into a shared
  `tests/_fetch.ts` helper remains the follow-up flagged in T-013's findings.

## T-026: Example for v1.completions

Per `specs/endpoints/v1-completions.md` and the Examples convention in
`specs/conventions.md`.

status: done

- Added `examples/v1-completions.ts`, the per-endpoint example for
  `/v1/completions` (path-to-filename mapping per the Examples convention).
- Followed the precedent of `examples/v1-models.ts` and `examples/tokenize.ts`:
  same header comment (purpose, run command, env-var overrides), same `Llama`
  construction from `LLAMA_BASE_URL`/`LLAMA_API_KEY`, importing via the
  `@emrahcom/llama-native` map entry.
- Calls `llama.v1.completions({ prompt, max_tokens })` with a single-string
  prompt and prints the first choice's `text`, exercising only the required
  field plus one optional field.

## T-027: Implement streaming helper and LlamaStreamError

Per `specs/core/streaming.md` and `specs/core/errors.md`.

status: done

- `src/errors/mod.ts`: added `LlamaStreamError extends LlamaError` with the
  spec's `(message, options?)` constructor, setting
  `this.name =
  "LlamaStreamError"`. It adds no fields beyond `LlamaError`, so
  a single `instanceof LlamaError` still catches it. Re-exported it from
  `src/mod.ts` alongside `LlamaError`/`LlamaHTTPError`, since the errors spec
  marks it `export`.
- `src/request/mod.ts`: factored the shared setup that `request()` and
  `requestStream()` both need into private helpers per the streaming spec's
  Location section — `resolvePath` (leading-slash normalization), `buildInit`
  (auth header, content-type, body serialization, signal forwarding),
  `sendRequest` (fetch invocation plus `AbortError`-unwrapped /
  `{method}
  {path} request failed` mapping), and `httpError` (the shared
  `LlamaHTTPError` construction). `request()` now composes these and is
  otherwise unchanged in behavior.
- Added the internal `requestStream<T>(options)` as an `async function*` so
  iteration is lazy: the body (and thus `fetch`) does not run until the first
  `next()`, so non-2xx, fetch, and parse errors all surface during iteration. It
  reuses `sendRequest`/`httpError` for the initial request, then reads
  `response.body` through `TextDecoderStream`, splits events on `\n\n`, collects
  `data:` line payloads (stripping a single leading space, joining multiple with
  `\n`, ignoring non-`data:` lines), completes cleanly on `data: [DONE]`, yields
  `JSON.parse`d payloads otherwise, throws `LlamaStreamError` on an unparseable
  chunk (`Failed to parse stream chunk`) and when the body ends without `[DONE]`
  (`Stream ended without [DONE] marker`), re-throws mid-stream `AbortError`
  unwrapped, wraps other mid-stream read failures in `LlamaError`
  (`{method}
  {path} stream failed`), and releases the reader lock in a
  `finally` so an early consumer break closes the connection. `requestStream` is
  not re-exported from `src/mod.ts`; it is internal infrastructure like
  `request`.

findings:

- No endpoint consumes `requestStream` yet, so it is not exercised end-to-end by
  any example or endpoint method. Wiring streaming into an endpoint (e.g. a
  `stream: true` variant of `v1.completions`) belongs to its own task once a
  streaming endpoint spec lands.
- No tests for `requestStream` yet; per the precedent set by T-012/T-013
  (`request` helper implemented, then tested in a separate task), streaming-
  helper tests belong to their own task.
- The mid-stream `read()` error mapping and the initial `sendRequest` fetch
  mapping share the same `AbortError`-unwrap shape but differ only in message
  (`stream failed` vs `request failed`); they are kept separate because the spec
  distinguishes the two phases. No refactor is warranted.

## T-028: Tests for streaming helper and LlamaStreamError

Per `specs/core/streaming.md` and `specs/core/errors.md`.

status: done

- `tests/errors.test.ts`: added `LlamaStreamError` cases mirroring the existing
  `LlamaError`/`LlamaHTTPError` cases against the errors spec's surface — it is
  an `instanceof Error`, `LlamaError`, and `LlamaStreamError` (so a single
  `instanceof LlamaError` catches it), forwards the `message`, sets `name` to
  `"LlamaStreamError"`, and preserves `cause` passed via `options`. Imported
  `LlamaStreamError` alongside the others from the `@emrahcom/llama-native`
  public surface.
- `tests/request.test.ts`: added `requestStream` cases covering the streaming
  spec. SSE parsing: yields parsed JSON payloads in order, buffers events split
  across read chunks, joins multiple `data:` lines in one event with `\n`,
  ignores non-`data:` lines (comments, `event:`, `id:`, `retry:`), and strips a
  single leading space after `data:` (verified via `data: [DONE]` being treated
  as the terminator rather than JSON-parsed). Termination: completes at `[DONE]`
  and ignores events after it, throws `LlamaStreamError`
  (`Stream ended without [DONE] marker`) when the body ends without `[DONE]` and
  when the response has no body. Laziness: `fetch` does not run until the first
  iteration. Error mapping: `LlamaStreamError` (`Failed to parse stream chunk`,
  cause a `SyntaxError`) on an unparseable payload; `LlamaHTTPError` with the
  spec's status/body/message on a non-2xx response before any value is yielded;
  a fetch `AbortError` propagated unchanged; a non-`AbortError` fetch rejection
  wrapped in `LlamaError` (`{method} {path} request failed`, cause preserved); a
  mid-stream `AbortError` re-thrown unchanged after the prior value is yielded;
  a mid-stream network error wrapped in `LlamaError`
  (`{method} {path} stream failed`, cause preserved). Setup/cancellation: sends
  method, path, and serialized body through the shared setup, forwards the
  `signal` to `fetch`, and stops cleanly when the consumer breaks out early.
- Per `specs/conventions.md` ("Tests for `src/<component>/` go in
  `tests/<component>.test.ts`"), the streaming-helper cases live in
  `tests/request.test.ts` alongside `request` (both are `src/request/`), and the
  error-class cases live in `tests/errors.test.ts`. Reused the existing
  `stubFetch`/`restoreFetch`/`FetchHandler` scaffolding; added local
  `sseResponse`/`sseThenError`/`collect` helpers for building SSE bodies and
  draining the iterator, per the convention that test duplication is acceptable.

findings:

- The streaming spec's "the response body reader is released so the underlying
  connection can be closed" on early break is exercised indirectly (the
  early-break case asserts iteration stops cleanly and runs the generator's
  `finally`), but `reader.releaseLock()` itself is not directly observable from
  a black-box test since the reader is internal to `requestStream`. No public
  hook exists to assert it without reaching into implementation internals.
- The mid-stream-error fixtures enqueue the chunk in `start` and raise the error
  on the next `pull` so the chunk is delivered before the error; raising the
  error in the same `start` turn drops the enqueued chunk through
  `TextDecoderStream`, which would not reflect real mid-stream failures.

## T-029: Fix stream cancellation to close the connection

Per `specs/core/streaming.md`.

status: done

- `src/request/mod.ts`: `requestStream`'s `finally` now calls
  `await reader.cancel().catch(() => {})` instead of `reader.releaseLock()`,
  matching the streaming spec's updated Cancellation section. `releaseLock()`
  only detached the reader, leaving `response.body` open until garbage
  collection; `cancel()` propagates upstream through the `TextDecoderStream` to
  `response.body` and closes the underlying connection. This covers the
  early-consumer-break case (the generator's `finally` runs on `.return()`) as
  well as clean `[DONE]` completion and error/`throw` paths.
- The rejection is swallowed with `.catch(() => {})`: cancelling an already
  errored stream rejects with the stream's stored error, which would otherwise
  mask the error already thrown from the read loop above.

findings:

- The existing "stops cleanly when the consumer breaks out early" test still
  passes but only asserts iteration halts; it cannot observe `cancel()` vs
  `releaseLock()` from a black-box position (the reader is internal to
  `requestStream`), the same limitation T-028's findings noted. No public hook
  exists to assert the connection is closed without reaching into internals, so
  no test change accompanies this fix.

## T-030: Add streaming to v1.completions

Per `specs/endpoints/v1-completions.md`.

status: done

- `src/v1/mod.ts`: added the `CompletionsChunk` and `ChunkChoice` interfaces (in
  the spec's surface order, between `Choice` and `Usage`) and added the optional
  `stream?: boolean` field to `CompletionsRequest`. All wire fields stay
  snake_case (`finish_reason`, `system_fingerprint`) per `specs/conventions.md`.
- `completions` is now overloaded per the spec's call signatures:
  `request: CompletionsRequest & { stream: true }` returns
  `AsyncIterable<CompletionsChunk>` and
  `request: CompletionsRequest & { stream?: false | undefined }` returns
  `Promise<CompletionsResponse>`. The overload is selected by the literal type
  of `request.stream`, so a non-literal `boolean` matches neither and is a
  compile error, as the spec requires.
- The implementation dispatches on `request.stream === true` at runtime: the
  streaming branch returns `requestStream<CompletionsChunk>` (imported as
  `sendRequestStream`) without awaiting, keeping iteration lazy per
  `specs/core/streaming.md`; the non-streaming branch returns the `request`
  helper's promise cast to `Promise<CompletionsResponse>`, unchanged from
  before. Both branches send `POST /v1/completions` with the
  `CompletionsRequest` (including `stream`) as the JSON body and forward
  `options?.signal`. The implementation signature is non-`async` so it can
  return either an `AsyncIterable` or a `Promise`.
- `src/mod.ts`: re-exported `CompletionsChunk` and `ChunkChoice` as types
  alongside the existing `/v1/completions` types, matching the conventions rule
  that names marked `export` in a spec belong on the public surface.

findings:

- No streaming-specific tests for `llama.v1.completions({ stream: true })` yet;
  per the precedent set by T-024/T-025 (implement, then test in a separate
  task), they belong to their own task. The streaming helper itself is already
  covered by `tests/request.test.ts` (T-028).
- `examples/v1-completions.ts` still demonstrates only the non-streaming call;
  adding a streaming variant (or a separate example) belongs to its own task per
  the Examples convention precedent.

## T-031: Tests for streaming v1.completions

Per `specs/endpoints/v1-completions.md`.

status: done

- Added `v1.completions` streaming cases to `tests/llama.test.ts` covering the
  /v1/completions-specific streaming surface from
  `specs/endpoints/v1-completions.md`: with `stream: true` it issues
  `POST <baseUrl>/v1/completions`, serializes the `CompletionsRequest` including
  the `stream` field as the JSON body, returns an
  `AsyncIterable<CompletionsChunk>` that yields the SSE `data:` chunks parsed in
  order (a `null`-`finish_reason` delta chunk followed by a final chunk with
  `finish_reason: "stop"`, `usage`, and `system_fingerprint`), and forwards the
  `signal` option to the underlying `fetch` call.
- Followed the precedent established by T-014/T-017/T-022/T-025: shared
  streaming behavior (SSE parsing, buffering, `[DONE]` termination, error
  mapping, abort propagation) is exercised in `tests/request.test.ts` against
  the `requestStream` helper directly (T-028) and is not duplicated here.
- Imported `CompletionsChunk` as a type alongside the existing
  `CompletionsResponse`/`Llama` imports from the public surface to annotate the
  expected chunk payloads. Added local `sseResponse`/`collect` helpers for
  building SSE response bodies and draining the async iterable; reused the
  existing `stubFetch`/`restoreFetch` pattern.

findings:

- The `stubFetch`/`restoreFetch`/`FetchHandler` trio and the SSE helpers
  (`encoder`, `sseResponse`, `collect`) are now duplicated between
  `tests/llama.test.ts` and `tests/request.test.ts`. Lifting the fetch-stub trio
  into a shared `tests/_fetch.ts` helper remains the follow-up flagged in
  T-013's findings; the SSE helpers could join it once a third streaming
  endpoint adds tests.

## T-032: Add streaming to the v1.completions example

Per `specs/endpoints/v1-completions.md` and the Examples convention in
`specs/conventions.md`.

status: done

- Extended `examples/v1-completions.ts` with a streaming variant alongside the
  existing non-streaming call, keeping a single file per endpoint as the
  Examples convention in `specs/conventions.md` requires (no separate file).
- The streaming variant passes `stream: true`, which selects the streaming
  overload returning an `AsyncIterable<CompletionsChunk>` per
  `specs/endpoints/v1-completions.md`. It iterates with `for await`, writing
  each chunk's `choices[0].text` delta to stdout, and notes that the `text`
  fields are deltas concatenated to reconstruct the full output, matching the
  spec's "Streaming chunk fields" description.
- Labeled the existing call as the non-streaming variant for contrast; the run
  instructions and `Llama` construction are unchanged.

findings:

- The streaming example writes raw deltas to `Deno.stdout` (a Deno-specific
  API), which is allowed for `examples/` per the conventions runtime rule.

## T-033: Fix null-body streaming message

Per `specs/core/streaming.md`.

status: done

- `src/request/mod.ts`: `requestStream` now throws `LlamaStreamError` with the
  message `Streaming response had no body` when `response.body` is `null`,
  matching the streaming spec's "OK response with no body" error-mapping entry.
  Previously it reused the `Stream ended without [DONE] marker` message, which
  conflated a missing body with a body that ended without the terminator.
- `tests/request.test.ts`: updated the "requestStream throws LlamaStreamError
  when a response has no body" case to assert the new
  `Streaming response had no body` message. This is the only test that pins the
  null-body message; the end-without-`[DONE]` case keeps its own message
  unchanged.

## T-034: Move Usage to src/types/v1.ts

Per `specs/endpoints/v1-completions.md`.

status: done

- Added `src/types/v1.ts` holding the `Usage` interface, following the
  shared-internal-types rule in `specs/conventions.md` (`src/types/<name>.ts`,
  one file per concern, no `mod.ts`). This matches the spec note in
  `specs/endpoints/v1-completions.md` that `Usage` is a shared v1 type defined
  in `src/types/v1.ts`, not in `src/v1/`.
- `src/v1/mod.ts`: removed the local `Usage` interface and added
  `import type { Usage } from "../types/v1.ts";`. The
  `CompletionsResponse.usage` and `CompletionsChunk.usage` references are
  unchanged.
- `src/mod.ts`: moved the `Usage` re-export out of the `./v1/mod.ts` type group
  into a new `export type { Usage } from "./types/v1.ts";`, keeping the public
  surface identical.

## T-035: Implement /v1/chat/completions

Per `specs/endpoints/v1-chat-completions.md`.

status: done

- Added `src/v1/chat/mod.ts` with the `Chat` sub-group and the spec's TypeScript
  surface in order: `ChatCompletionsRequest`, `Message`,
  `ChatCompletionsResponse`, `ChatChoice`, `AssistantMessage`,
  `ChatCompletionsChunk`, `ChatChunkChoice`, and `Delta`. `Chat` holds the
  parent's frozen `Config` in a private `#config` field and exposes the
  overloaded `completions(request, options?)`: `stream: true` selects the
  streaming overload returning `AsyncIterable<ChatCompletionsChunk>`,
  `stream: false`/omitted/`undefined` selects the non-streaming overload
  returning `Promise<ChatCompletionsResponse>`, and a non-literal `boolean`
  matches neither (compile error). Mirrors the dispatch in `V1.completions`: the
  streaming branch returns `requestStream<ChatCompletionsChunk>` without
  awaiting (lazy iteration per `specs/core/streaming.md`); the non-streaming
  branch returns the `request` helper's promise. Both send
  `POST /v1/chat/completions` with the `ChatCompletionsRequest` as the JSON body
  and forward `options?.signal`. Imports the shared `Usage` from
  `../../types/v1.ts`; auth, error mapping, and abort handling come from
  `specs/core/request.md`/`specs/core/streaming.md` unchanged. All wire fields
  use snake_case (`max_tokens`, `finish_reason`, `system_fingerprint`).
- `src/v1/mod.ts`: added the readonly `chat: Chat` property to `V1`, constructed
  with the `Config` `V1` already holds, per the recursive sub-group template in
  `specs/core/llama.md` (`/v1/chat/completions` is a three-segment path, so
  `completions` lives on the `chat` sub-group under `v1`).
- `src/mod.ts`: re-exported the eight `export`-marked chat types as types. The
  `Chat` class is not marked `export` in the spec (reached through
  `llama.v1.chat`), so it stays internal, matching how `V1` is handled.

findings:

- No tests for `llama.v1.chat.completions()` yet; per the precedent set by
  T-024/T-025 and T-030/T-031, chat-completions tests (non-streaming and
  streaming) belong to their own task.
- No `examples/v1-chat-completions.ts` yet; per the precedent set by T-025/T-026
  and the Examples convention (`/v1/chat/completions` →
  `examples/v1-chat-completions.ts`), the example belongs to its own task.

## T-036: Tests for /v1/chat/completions

Per `specs/endpoints/v1-chat-completions.md`.

status: done

- Added `v1.chat.completions` cases to `tests/llama.test.ts` covering the
  /v1/chat/completions-specific surface from
  `specs/endpoints/v1-chat-completions.md`. Non-streaming: it issues
  `POST <baseUrl>/v1/chat/completions`, serializes the `ChatCompletionsRequest`
  as the JSON body preserving the snake_case optional fields (`max_tokens`, plus
  `model`/`stop`/`temperature`) and the `messages` list when provided, omits the
  optional fields from the body when not provided (so they are not forced onto
  the wire as `undefined`), returns the parsed JSON body as
  `ChatCompletionsResponse` on HTTP 200 (a fully-formed response including a
  `ChatChoice`, `AssistantMessage`, `Usage`, and `system_fingerprint`), and
  forwards the `signal` option to the underlying `fetch` call.
- Streaming: with `stream: true` it issues `POST <baseUrl>/v1/chat/completions`,
  serializes the `ChatCompletionsRequest` including the `stream` field as the
  JSON body, returns an `AsyncIterable<ChatCompletionsChunk>` that yields the
  SSE `data:` chunks parsed in order (a first chunk with a `role`-bearing
  `Delta` and `finish_reason: null`, followed by a final chunk with
  `finish_reason: "stop"`, `usage`, and `system_fingerprint`), and forwards the
  `signal` option to the underlying `fetch` call.
- Followed the precedent established by T-025/T-031: shared HTTP and streaming
  behavior (auth, error mapping, abort propagation, SSE parsing, `[DONE]`
  termination, JSON parse failures) is exercised in `tests/request.test.ts`
  against the `request`/`requestStream` helpers directly and is not duplicated
  here.
- Imported `ChatCompletionsResponse` and `ChatCompletionsChunk` as types
  alongside the existing `CompletionsResponse`/`CompletionsChunk`/`Llama`
  imports from the public surface to annotate the expected payloads. Reused the
  existing `stubFetch`/`restoreFetch` pattern and the `sseResponse`/`collect`
  SSE helpers already present in `tests/llama.test.ts`; no new helpers or
  imports were needed.

findings:

- No `examples/v1-chat-completions.ts` yet; per the precedent set by T-025/T-026
  and the Examples convention (`/v1/chat/completions` →
  `examples/v1-chat-completions.ts`), the example belongs to its own task
  (already flagged in T-035's findings).
- The `stubFetch`/`restoreFetch`/`FetchHandler` trio and the SSE helpers
  (`encoder`, `sseResponse`, `collect`) remain duplicated between
  `tests/llama.test.ts` and `tests/request.test.ts`. Lifting them into a shared
  `tests/_fetch.ts` helper remains the follow-up flagged in T-013's and T-031's
  findings.

## T-037: Example for /v1/chat/completions

Per `specs/endpoints/v1-chat-completions.md` and the Examples convention in
`specs/conventions.md`.

status: done

- Added `examples/v1-chat-completions.ts`, named per the Examples convention
  (`/v1/chat/completions` → `examples/v1-chat-completions.ts`).
- Followed the precedent of `examples/v1-completions.ts`: same header comment
  (purpose, run command, env-var overrides), same `Llama` construction from
  `LLAMA_BASE_URL`/`LLAMA_API_KEY`, importing via the `@emrahcom/llama-native`
  map entry, and demonstrating both the non-streaming and streaming variants in
  a single file per endpoint.
- The non-streaming variant calls
  `llama.v1.chat.completions({ messages,
  max_tokens })` with a system+user
  `messages` list and prints the first choice's `message.content`. The streaming
  variant passes `stream: true`, which selects the streaming overload returning
  `AsyncIterable<ChatCompletionsChunk>`; it iterates with `for await`, writing
  each chunk's `delta.content` to stdout (guarding the optional field, since
  `delta` carries only `role` on the first chunk), and notes that the
  `delta.content` fragments are concatenated to reconstruct the full reply,
  matching the spec's "Streaming chunk fields" description.

findings:

- The streaming example writes raw deltas to `Deno.stdout` (a Deno-specific
  API), which is allowed for `examples/` per the conventions runtime rule, as
  already noted in T-032's findings for `examples/v1-completions.ts`.

## T-038: Integration tests

Per the "Integration tests live under `integration/`" rule in
`specs/conventions.md`.

status: done

- Added the `integration/` directory with one file per endpoint, named by the
  endpoint path with slashes replaced by hyphens: `integration/health.test.ts`,
  `integration/tokenize.test.ts`, `integration/v1-models.test.ts`,
  `integration/v1-completions.test.ts`, and
  `integration/v1-chat-completions.test.ts`. Each exercises its endpoint against
  a running llama-server via `new Llama()` with no arguments (the default local
  server), not stubbed `fetch`, and asserts the real response matches the typed
  shape from the public surface.
- One test per endpoint case: single tests for `health`, `tokenize`, and
  `v1.models`; two tests each for `v1.completions` and `v1.chat.completions`,
  covering the non-streaming and streaming modes. The streaming cases drain the
  returned `AsyncIterable` with `for await` and assert each chunk's shape.
- Imports the public surface through the `@emrahcom/llama-native` import-map
  entry, exercising the module as a consumer would, and annotates each response
  with its exported type so the shape is checked at compile time as well as at
  runtime.
- Confirmed the default `deno test` run still covers only `tests/` (the
  `test.include` in `deno.json` excludes `integration/`), so these stay out of
  the default check, and `deno publish --dry-run` does not list `integration/`.

findings:

- The streaming chunk assertions pin `logprobs` to `null` and `finish_reason` to
  `"stop" | "length" | null` to match the typed shapes; if a real server build
  diverges (e.g. omits `logprobs` from chunks), that is a spec/type mismatch to
  surface from an actual run, which is the purpose of these tests. They could
  not be executed here as no llama-server was available.

## T-039: Align chat types with live server shapes

Per `specs/endpoints/v1-chat-completions.md`.

status: done

- Updated the chat types in `src/v1/chat/mod.ts` to match the revised spec:
  removed the `logprobs: null` field from `ChatChoice` and `ChatChunkChoice`,
  added an optional `reasoning_content?: string` to `AssistantMessage` and
  `Delta`, and widened `Delta.content` from `string | undefined` to
  `string | null | undefined` (the role-only first chunk carries
  `content: null`).
- Updated the unit-test fixtures in `tests/llama.test.ts` that mirror these
  shapes, dropping `logprobs: null` from the chat (`chat.completion`) and chat
  chunk (`chat.completion.chunk`) fixtures while leaving the completions
  (`text_completion`) fixtures, which still carry `logprobs`, untouched.
- Updated `integration/v1-chat-completions.test.ts` to stop asserting the
  removed `logprobs` field and to accept a `null` `delta.content` (the
  truthiness/`!= null` guard skips the `typeof` check for both `null` and
  `undefined`), keeping the integration file compilable against the new types.
- Confirmed `deno fmt`, `deno lint`, `deno check src/mod.ts`, `deno test`, and
  `deno publish --dry-run --allow-dirty` all pass; `deno check` of the
  integration file also passes.

## T-040: Document the public surface

Per the Documentation rule in `specs/conventions.md` and each symbol's spec.
