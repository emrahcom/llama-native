# CLAUDE.md

## What this is

A Deno/JSR TypeScript module that wraps llama.cpp's llama-server REST API.

## Principles

- **KISS**
  - Keep everything as simple and clear as possible.
  - Simpler is better than clever.

- **YAGNI**
  - No features for speculative future requirements.
  - Build only what is needed now.

- **Spec-first**
  - Every area of the library (under `src/`) has a spec under `specs/`, written
    before its code.
  - The spec is authoritative: code follows it, and code-level problems are
    fixed by updating the spec first.
  - Specs are implementation-complete: someone with no access to prior code can
    produce a working implementation from the spec alone.
  - Tests verify implementations and examples illustrate them; both are
    hand-maintained and do not require specs.

## Hard constraints

- **Runtime**\
  Deno is the primary runtime. Node compatibility is preserved when it costs
  nothing.

- **Dependencies**\
  Zero runtime dependencies beyond portable `@std/*` modules.

- **Minimum llama-server build**\
  The module targets llama-server `b9300` and later.

## Workflow rules

- Push back on questionable specs or tasks; raise findings during implementation
  rather than silently agreeing.
- Read the relevant spec section before implementing.
- Do only what the task defines. Adjacent work (tests, examples, refactors)
  belongs to its own task; note observations or suggestions as findings when
  completing the task instead of implementing them.
- Make changes small and reversible.
- Run the formatter, linter, type-checker, documentation check, unit tests, and
  publishability check before considering any change done.
- To change behavior, update the spec first, then the code, then tests.
- Flag any change that would break Node compatibility before applying it.
- Update `TASKS.md` after completing a task. Follow `specs/tasks.md` for the
  format.

## Where things live

- `TASKS.md`\
  Task list with status and change notes.

- `specs/`\
  Cross-cutting rules at the top level.

- `specs/core/`\
  Library-wide specs.

- `specs/endpoints/`\
  Per-endpoint specs.

- `specs/conventions.md`\
  Project-wide naming, typing, structure, and workflow rules.

- `specs/references.md`\
  Upstream documentation links.

- `specs/tasks.md`\
  Format conventions for entries in `TASKS.md`.

- `src/`\
  Implementation. Created as endpoints reach implementation.

- `tests/`\
  Populated alongside `src/`.

- `integration/`\
  Integration tests against a live `llama-server`. One per endpoint; not part of
  the default check.

- `examples/`\
  One runnable example per endpoint, added after that endpoint is implemented.

## Commands

- `deno fmt`\
  Format.

- `deno lint`\
  Lint.

- `deno check src/mod.ts`\
  Type-check.

- `deno doc --lint src/mod.ts`\
  Check documentation coverage.

- `deno test`\
  Run unit tests.

- `deno test --allow-net integration/`\
  Run integration tests against a running llama-server. Not part of the default
  check; requires a local server.

- `deno publish --dry-run --allow-dirty`\
  Verify the module is publishable.
