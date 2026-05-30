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
  readonly config: Config;
}
```

Endpoint specs add methods and sub-group properties to `Llama` per the endpoint
access rule below.

`Config` is not exported. It is a shared internal type defined in
`src/types/config.ts` (per the shared-types rule in `specs/conventions.md`), not
in `src/llama/`. It is shown here because `Llama` exposes it through the
readonly `config` property.

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

The configuration is frozen after construction; assignment to any field on
`config` throws a `TypeError`. To change `baseUrl` or `apiKey`, create a new
`Llama` instance.

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
class <SubGroupName> {
  constructor(config: Config);
  // endpoint methods and nested sub-groups added by endpoint specs
}
```

Sub-groups receive the internal `Config` instance from their parent class
(either `Llama` or a containing sub-group) at construction and use it directly
without re-declaring its type.

When an endpoint spec creates a new sub-group (top-level or nested), it adds the
corresponding readonly property to the parent class.
