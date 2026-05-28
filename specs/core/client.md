# Client

The top-level entry point of the module.

## Location

`src/client/`

## TypeScript surface

```ts
export interface ClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

interface Config {
  readonly baseUrl: string;
  readonly apiKey?: string;
}

export class Llama {
  constructor(options?: ClientOptions);
  readonly config: Config;
  readonly server: Server;
}
```

## Constructor

`new Llama(options?: ClientOptions)`.

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

## Sub-clients

A sub-client is a class with the shape:

```ts
class <SubClientName> {
  constructor(config: Config);
  // endpoint methods added by endpoint specs
}
```

The `Server` sub-client holds the endpoint methods specified under
`specs/endpoints/`.

Sub-clients group related endpoint methods on the `Llama` class. Each endpoint
spec defines which sub-client its method belongs to, creating a new sub-client
or adding to an existing one. Sub-clients receive the same internal `Config`
instance from the `Llama` class at construction and use it directly without
re-declaring its type.

When an endpoint spec creates a new sub-client, it adds the corresponding
readonly property to the `Llama` class in the TypeScript surface above.
