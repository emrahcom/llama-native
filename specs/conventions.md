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
  Anything intended to be visible to consumers of the module is re-exported from
  the top-level `src/mod.ts`.

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
