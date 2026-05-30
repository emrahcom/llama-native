# Streaming helper

Shared utility used by endpoint methods that consume Server-Sent Events (SSE)
streams from llama-server.

## Location

`src/request/`

The streaming helper lives alongside `request()` in `src/request/mod.ts`. Shared
internal logic (URL composition, header construction, body serialization, fetch
invocation, and signal forwarding) is factored into private helpers within that
file so both `request()` and `requestStream()` share the setup before diverging
on response handling.

## TypeScript surface

```ts
function requestStream<T>(options: RequestOptions): AsyncIterable<T>;
```

`requestStream` is internal. It is not re-exported from `src/mod.ts`. Endpoint
methods import it directly from `src/request/mod.ts`. `RequestOptions` is the
same interface defined in `specs/core/request.md`.

## Behavior

- Sends a fetch request as specified by `options`, using the same URL,
  authorization, content-type, body serialization, and signal forwarding rules
  as `request()`.
- Returns an `AsyncIterable<T>` that yields parsed event payloads in the order
  the server emits them. Iteration is lazy: the underlying `fetch` runs on the
  first `next()` call on the iterator, so all errors below surface during
  iteration rather than synchronously from `requestStream` itself.

### SSE parsing

- The response body is read as a UTF-8 byte stream and decoded with
  `TextDecoderStream`.
- Events are separated by `\n\n`. Within each event, lines starting with `data:`
  contribute their payload (the text after the `data:` prefix). When an event
  contains multiple `data:` lines, their payloads are joined with `\n`.
- Lines that are not `data:` (comments, `event:`, `id:`, `retry:`, etc.) are
  ignored.
- If a `data:` payload begins with a single space, the space is stripped.

For each event with a data payload:

- If the payload is the literal string `[DONE]`, iteration completes cleanly
  with no value yielded.
- Otherwise, the payload is parsed with `JSON.parse` and the parsed value is
  yielded as `T`.

### Termination

The stream terminates cleanly only after a `data: [DONE]` event. If the response
body ends without `[DONE]`, the iterator throws `LlamaStreamError`.

Content remaining in the buffer at end of stream without a terminating `\n\n` is
treated as an incomplete event and discarded.

### Cancellation

When `options.signal` is provided and aborted, the underlying fetch is aborted
and the iterator throws the original `AbortError` unwrapped, matching the
non-streaming `request()` behavior. If the consumer breaks out of iteration
early, the response body stream is cancelled via the reader's `cancel()` method.
Cancellation propagates upstream through the `TextDecoderStream` to
`response.body` and closes the underlying connection, rather than leaving it
open until garbage collection.

## Error mapping

The helper translates failures into the library's error types per
`specs/core/errors.md`:

- **`fetch` rejection that is `AbortError`**\
  Re-thrown unchanged on the iteration that triggered the fetch.

- **`fetch` rejection that is not `AbortError`**\
  Wrapped in `LlamaError` with the original error attached via `cause`.\
  Message: `{method} {path} request failed`.

- **Non-2xx response**\
  Thrown as `LlamaHTTPError` on the first iteration, before any value is
  yielded. Status, body, and message follow the same rules as
  `specs/core/request.md`.

- **Unparseable `data:` payload**\
  Thrown as `LlamaStreamError` with `JSON.parse`'s error attached via `cause`.\
  Message: `Failed to parse stream chunk`.

- **Response body ends without `[DONE]`**\
  Thrown as `LlamaStreamError`.\
  Message: `Stream ended without [DONE] marker`.

- **Network error mid-stream (after iteration has started yielding)**\
  Wrapped in `LlamaError` with the original error attached via `cause`.\
  Message: `{method} {path} stream failed`.
