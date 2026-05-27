# Conventions

Rules that every spec and the implementation inherit.

## Naming

- **snake_case for wire types**\
  Field names in request bodies sent to llama-server and response bodies
  received from it match the server's JSON field names verbatim. Any field that
  crosses an HTTP boundary in either direction follows this rule.

- **camelCase for client-only types**\
  Types that never touch the wire (constructor options, internal config, error
  class fields, utility parameters) use camelCase.

## Typing

- **Explicit return types on public exports**\
  Required by JSR's no-slow-types rule. Applies to every exported function,
  method, and getter.

## Structure

- **Components live in folders under `src/`**\
  Each component folder contains `mod.ts` as its entry point.

- **Shared internal types in `src/types/`**\
  Types used by more than one component live in `src/types/<name>.ts`, one file
  per concern (e.g., `src/types/config.ts`). No `mod.ts` is required.

- **Public surface re-exported from `src/mod.ts`**\
  Re-export from `src/mod.ts` exactly the names that specs mark with the
  `export` keyword. Types or classes used in spec signatures but not marked
  `export` stay internal, even if a consumer would need them to name the type by
  hand.

## Runtime

- **Web Standards only in `src/`**\
  Use Web Standards available in both Deno and Node. Common examples: `fetch`,
  `ReadableStream`, `TextDecoderStream`, `AsyncIterable`, `AbortController`,
  `TextEncoder`, `TextDecoder`, `URL`, `JSON`, `Error`.

- **No `Deno.*` in `src/`**\
  Preserves Node compatibility.\
  `tests/` and `examples/` may use Deno-specific APIs freely.

## Testing

- **Test files live under `tests/`**\
  Tests for `src/<component>/` go in `tests/<component>.test.ts`.

## Examples

- **One file per endpoint under `examples/`**\
  The file name is the endpoint path with slashes replaced by hyphens (e.g.,
  `/health` → `examples/health.ts`, `/v1/chat/completions` →
  `examples/v1-chat-completions.ts`).

## Publishing

- **Exclude development-only files from the published package**\
  `deno.json` `publish.exclude` lists:
  - `CLAUDE.md`
  - `TASKS.md`
  - `specs`
  - `tests`

  `examples` ships as documentation.
