# Llama

The top-level entry point of the module.

## Location

`src/llama/`

## TypeScript surface

```ts
export interface LlamaOptions {
  baseUrl?: string;
  apiKey?: string;
}

interface Config {
  readonly baseUrl: string;
  readonly apiKey?: string;
}

export class Llama {
  constructor(options?: LlamaOptions);
  #config: Config;
}
```

Endpoint specs add methods and sub-group properties to `Llama` per the endpoint
access rule below.

`Config` is not exported. It is a shared internal type defined in
`src/types/config.ts` (per the shared-types rule in `specs/conventions.md`), not
in `src/llama/`. `Llama` holds it in a private `#config` field and never exposes
it on the public surface; in particular, the `apiKey` it carries is not readable
through any public member and is not serialized by `JSON.stringify`.

## Constructor

```
new Llama(options?: LlamaOptions)
```

- **`baseUrl` default**\
  `"http://localhost:8080"` when not provided.\
  Matches llama-server's default port.

- **`baseUrl` normalization**\
  One or more trailing slashes are stripped.

- **`apiKey` default**\
  Undefined when not provided.

Configuration is fixed at construction; to use a different `baseUrl` or
`apiKey`, create a new `Llama` instance.

## Endpoint access

Endpoints are accessed via methods derived from their URL path:

- Each URL path segment becomes a level in the JS access chain.
- The last segment is the method name; earlier segments are sub-groups.
- Hyphens in segment names are converted to camelCase for JS identifiers.

Examples:

- `/health` → `llama.health()`
- `/tokenize` → `llama.tokenize()`
- `/apply-template` → `llama.applyTemplate()`
- `/v1/models` → `llama.v1.models()`
- `/v1/chat/completions` → `llama.v1.chat.completions()`

Single-segment URLs become methods on `Llama` directly. Multi-segment URLs
introduce sub-groups for each prefix segment.

## Sub-groups

A sub-group is a class with the shape:

```ts
export class <SubGroupName> {
  /** @internal */
  constructor(config: Config);
  #config: Config;
  // endpoint methods and nested sub-groups added by endpoint specs
}
```

Sub-groups are exported, so each class and its methods appear on the public
documented surface and consumers can name the type (`V1`, `Chat`, and any added
later). They are constructed by their parent (`Llama` or a containing
sub-group), never by consumers; the constructor is marked `@internal` so it is
excluded from the documented surface and not advertised as a construction path.

A sub-group receives the internal `Config` from its parent at construction and
holds it in a private `#config` field (the shared `Config` type, not
re-declared), the same way `Llama` does, so the `apiKey` it carries is never
exposed or serialized at any level.

When an endpoint spec creates a new sub-group (top-level or nested), it adds the
corresponding readonly property to the parent class (e.g. `readonly v1: V1`).
That property is part of the public surface and references the exported
sub-group type.
