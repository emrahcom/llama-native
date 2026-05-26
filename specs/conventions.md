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

## Runtime

- **Web Standards only in `src/`**\
  Allowed: `fetch`, `ReadableStream`, `TextDecoderStream`, `AsyncIterable`,
  `AbortController`, `TextEncoder`, `TextDecoder`, `URL`, `JSON`, `Error`. No
  runtime-specific globals.

- **No `Deno.*` in `src/`**\
  Preserves Node compatibility. `tests/` and `examples/` may use Deno-specific
  APIs freely.
