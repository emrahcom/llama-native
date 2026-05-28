# Errors

Custom error classes thrown by the library.

## Location

`src/errors/`

## TypeScript surface

```ts
export class LlamaError extends Error {
  constructor(message: string, options?: ErrorOptions);
}

export class LlamaHTTPError extends LlamaError {
  constructor(
    message: string,
    status: number,
    body?: unknown,
    options?: ErrorOptions,
  );
  readonly status: number;
  readonly body?: unknown;
}
```

Each class sets `this.name` in its constructor to the class name (e.g.,
`this.name = "LlamaHTTPError"`). Without this, stack traces and `toString()`
output show the inherited `Error` name instead of the actual class, which hurts
debugging.

## LlamaError

Base class for every error thrown by the library. All other error classes extend
`LlamaError`, so consumers can catch any library failure with a single
`instanceof LlamaError` check.

Thrown directly when no more specific class applies: network failures (with the
original error attached via `cause`), response bodies that cannot be parsed, and
similar.

`AbortError` is not wrapped. When a consumer aborts a request, the original
`AbortError` from `fetch` propagates unchanged so cancellation can be detected
the way it normally is in fetch-based code.

## LlamaHTTPError

Thrown when llama-server responds with a non-2xx status code.

- **`status`**\
  The HTTP status code (e.g., 404, 500).

- **`body`**\
  The parsed response body.
  - If the response was JSON, this is the parsed value,\
    typically `{ error: { code, message, type } }` from llama-server
  - If the response was not JSON, this is the raw text.
  - `undefined` if the body could not be read.

Message format:

```
HTTP {status} from {method} {path}
```
