# GenerationParams

Request parameters shared by the generation endpoints (`/v1/completions` and
`/v1/chat/completions`). They configure the same underlying sampler, so each
endpoint's request composes this type instead of re-declaring the fields.

## Type

```ts
export interface GenerationParams {
  /** Maximum number of tokens to generate. */
  max_tokens?: number;
  /** Stop generation when any of these strings is produced. */
  stop?: string | string[];
  /** Sampling temperature; higher is more random, lower is more deterministic. */
  temperature?: number;
}
```

All fields are optional; an omitted field uses the llama-server default. These
three move verbatim from the current completions and chat request specs (same
names, types, and meaning), consolidated here as their single home.

## Composition

Each generation endpoint's request `extends GenerationParams` and adds its own
fields (`prompt` for completions, `messages` for chat). `stream` stays on the
per-endpoint request: it is the discriminant the streaming overloads pivot on,
not a generation parameter. The endpoint specs define their own request types;
this spec owns only the shared base.

## Visibility

`GenerationParams` is exported, so the exported request types can reference it
and consumers can name it, and it carries JSDoc on the type and every member. It
lives in `src/types/`.
