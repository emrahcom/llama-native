# CLAUDE.md

## What this is

A Deno/JSR TypeScript module that wraps llama.cpp's llama-server REST API.

## Principles

- **KISS**\
  Keep everything as simple and clear as possible. Simpler is better than
  clever.

- **YAGNI**\
  No features for speculative future requirements. Build only what is needed
  now.

- **Spec-first**\
  Every area has a spec under `specs/`, written before its code. The spec is
  authoritative: code follows it. Specs are implementation-complete: someone
  with no access to prior code can produce a working implementation from the
  spec alone.

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
- Run the formatter, linter, tests, and publishability check before considering
  any change done.
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
  Library-wide specs (client class, error types).

- `specs/endpoints/`\
  Per-endpoint specs.

- `specs/conventions.md`\
  Naming, typing, structure, runtime, and testing rules.

- `specs/references.md`\
  Upstream documentation links.

- `specs/tasks.md`\
  Format conventions for entries in `TASKS.md`.

- `src/`\
  Implementation. Created as endpoints reach implementation.

- `tests/`\
  Populated alongside `src/`.

- `examples/`\
  One runnable example per endpoint, added after that endpoint is implemented.

## Commands

- `deno fmt`\
  Format.

- `deno lint`\
  Lint.

- `deno test`\
  Run tests.

- `deno publish --dry-run --allow-dirty`\
  Verify the module is publishable.
