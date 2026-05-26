# Client

The top-level entry point of the module.

## TypeScript surface

The module exports:

```ts
export interface ClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export class Llama {
  constructor(options?: ClientOptions);
  readonly config: {
    readonly baseUrl: string;
    readonly apiKey?: string;
  };
}
```

## Constructor

`new Llama(options?: ClientOptions)`.

- **`baseUrl` default**\
  `"http://localhost:8080"` when `options.baseUrl` is undefined or falsy.\
  Matches llama-server's default port.

- **`baseUrl` normalization**\
  One or more trailing slashes are stripped.

- **`apiKey` default**\
  Undefined when not provided.\
  When set, sub-clients add an `Authorization: Bearer <key>` header to outbound
  requests.

The configuration is fixed after construction. To change `baseUrl` or `apiKey`,
create a new `Llama` instance.

## Sub-clients

Sub-clients group related endpoint methods on the `Llama` class. Each endpoint
spec defines which sub-client its method belongs to, creating a new sub-client
or adding to an existing one. Sub-clients receive the configuration at
construction and use it to build their requests.
