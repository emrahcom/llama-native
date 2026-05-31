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

## Documentation

- **JSDoc on every exported symbol**\
  Every exported symbol carries a JSDoc comment: classes, methods, interfaces,
  type aliases, and the public members of exported interfaces and classes.

- **JSDoc text comes from the spec**\
  The JSDoc text is the symbol's spec description rendered as a standalone
  comment. A description change is made in the spec first, then the JSDoc
  follows. JSDoc introduces no description absent from the spec.

- **Module doc on the entrypoint**\
  `src/mod.ts` carries a module doc summarizing the public API.

- **Doc coverage checked with `deno doc --lint`**\
  `deno doc --lint src/mod.ts` reports exported symbols missing documentation
  and is the coverage check for this rule.

## Testing

- **Test files live under `tests/`**\
  Tests for `src/<component>/` go in `tests/<component>.test.ts`.

- **Duplication between test files is acceptable**\
  Shared test scaffolding (e.g. `fetch` stubs, helper types) may be repeated
  across test files. Do not extract it into a shared helper.

- **Integration tests live under `integration/`**\
  Integration tests exercise endpoints against a running llama-server instead of
  stubbed `fetch`, confirming that real server output matches the typed shapes.
  They target the default local server (`new Llama()` with no arguments) and are
  not gated on any environment variable. One file per endpoint, named by the
  endpoint path with slashes replaced by hyphens (e.g.
  `integration/v1-chat-completions.test.ts`), with one test per endpoint case
  (each endpoint, each mode). They are not part of the default `deno test` run,
  require a running server, and are not published.

## Examples

- **One file per endpoint under `examples/`**\
  The file name is the endpoint path with slashes replaced by hyphens (e.g.,
  `/health` → `examples/health.ts`, `/v1/chat/completions` →
  `examples/v1-chat-completions.ts`).

- **Run command matches the permissions used**\
  Each example's header documents a `deno run` command whose flags are exactly
  the permissions the example needs. Examples read `baseUrl` and `apiKey` from
  the optional `LLAMA_BASE_URL` and `LLAMA_API_KEY` environment variables
  (client defaults apply when unset), so they call `Deno.env.get` and the
  command includes both `--allow-net` and `--allow-env`.

## Publishing

- **Exclude development-only files from the published package**\
  Development artifacts (`CLAUDE.md`, `TASKS.md`, `integration`, `specs`,
  `tests`) and repository metadata do not ship. `deno.json` `publish.exclude` is
  the authoritative list.

  `examples` ships as documentation.
