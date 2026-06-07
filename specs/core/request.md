# Request helper

Shared utility used by every endpoint method to issue HTTP calls to llama-server
and map failures to the library's error types.

## Location

`src/request/`

## TypeScript surface

```ts
interface RequestOptions {
  config: Config;
  method: string;
  path: string;
  body?: unknown;
  signal?: AbortSignal;
}

function request(options: RequestOptions): Promise<unknown>;
```

Neither `request` nor `RequestOptions` is re-exported from `src/mod.ts`. The
helper is internal infrastructure; endpoint methods import it directly from
`src/request/mod.ts`.

## Behavior

- Sends a fetch request to `${config.baseUrl}${path}` using `method`. If `path`
  does not start with `/`, one is prepended.
- Sets `Authorization: Bearer ${apiKey}` when `config.apiKey` is set.
- Sets `Content-Type: application/json` and serializes `body` with
  `JSON.stringify` when `body` is given.
- Forwards `signal` to fetch when provided.
- Parses the success response with `await response.json()` and returns the
  parsed value as `unknown`.

## Error mapping

The helper translates failures into the library's error types per
`specs/core/errors.md`:

- **`AbortError` (from the `fetch` or from reading the success body)**\
  Re-thrown unchanged, so the consumer's `AbortController` semantics are
  preserved. This covers both an abort during the initial `fetch` and an abort
  raised by `response.json()` while the body is still being read. Recognized per
  the abort rule in `specs/core/errors.md`.

- **`fetch` rejection that is not `AbortError`**\
  Wrapped in `LlamaError` with the original error attached via `cause`. Message:
  `{method} {path} request failed`.

- **Non-2xx response**\
  Thrown as `LlamaHTTPError` with the response's status code and a body produced
  as follows: read the body as text; if the text is parseable as JSON, the body
  is the parsed value; otherwise the body is the raw text; if the body cannot be
  read at all, the body is `undefined`. Message:
  `HTTP {status} from {method} {path}`.

- **Success response with unparseable body**\
  Wrapped in `LlamaError` with `JSON.parse`'s error attached via `cause`.
  Message: `Failed to parse {method} {path} response body`. This applies only to
  a genuine parse failure; an `AbortError` raised while reading the body is
  re-thrown unchanged per the abort bullet above, not wrapped here.
