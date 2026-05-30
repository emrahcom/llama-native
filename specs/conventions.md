# Conventions

Rules that every spec and the implementation inherit.

## Naming

- **snake_case for wire types**\
  Field names in request bodies sent to llama-server and response bodies
  received from it match the server's JSON field names verbatim. Any field that
  crosses an HTTP boundary in either direction follows this rule.

- **camelCase for library-only types**\
  Types that never touch the wire (constructor options, internal config, error
  class fields, utility parameters) use camelCase.

## Typing

- **Explicit return types on public exports**\
  Required by JSR's no-slow-types rule. Applies to every exported function,
  method, and getter.

- **Type to what each context can reach**\
  A field is typed to the values that can actually occur where it appears, not
  widened to cover every context it might appear in. When one conceptual object
  has different reachable shapes across contexts (request vs response,
  non-streaming vs streaming), each context gets its own type rather than one
  widened type shared between them.

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

- **Duplication between test files is acceptable**\
  Shared test scaffolding (e.g. `fetch` stubs, helper types) may be repeated
  across test files. Do not extract it into a shared helper.

## Examples

- **One file per endpoint under `examples/`**\
  The file name is the endpoint path with slashes replaced by hyphens (e.g.,
  `/health` → `examples/health.ts`, `/v1/chat/completions` →
  `examples/v1-chat-completions.ts`).

## Publishing

- **Exclude development-only files from the published package**\
  Development artifacts (`CLAUDE.md`, `TASKS.md`, `specs`, `tests`) and
  repository metadata do not ship. `deno.json` `publish.exclude` is the
  authoritative list.

  `examples` ships as documentation.
