/**
 * Base class for every error thrown by the library. All other error classes
 * extend `LlamaError`, so consumers can catch any library failure with a single
 * `instanceof LlamaError` check.
 *
 * Thrown directly when no more specific class applies: network failures (with
 * the original error attached via `cause`), response bodies that cannot be
 * parsed, and similar.
 *
 * `AbortError` is not wrapped. When a consumer aborts a request, the original
 * `AbortError` from `fetch` propagates unchanged so cancellation can be detected
 * the way it normally is in fetch-based code.
 */
export class LlamaError extends Error {
  /** Creates a `LlamaError` with the given message and optional `cause`. */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LlamaError";
  }
}

/**
 * Thrown when llama-server responds with a non-2xx status code.
 *
 * The message has the format `HTTP {status} from {method} {path}`.
 */
export class LlamaHTTPError extends LlamaError {
  /** The HTTP status code (e.g., 404, 500). */
  readonly status: number;
  /**
   * The parsed response body.
   * - If the response was JSON, this is the parsed value, typically
   *   `{ error: { code, message, type } }` from llama-server.
   * - If the response was not JSON, this is the raw text.
   * - `undefined` if the body could not be read.
   */
  readonly body?: unknown;

  /**
   * Creates a `LlamaHTTPError` with the given message, HTTP `status`, parsed
   * `body`, and optional `cause`.
   */
  constructor(
    message: string,
    status: number,
    body?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "LlamaHTTPError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Thrown for failures specific to consuming an SSE stream from llama-server:
 *
 * - when a `data:` payload cannot be parsed as JSON
 * - when the streaming response has no body (`response.body` is `null`)
 * - in sentinel mode, when the response body ends without the `data: [DONE]`
 *   terminator. Native-mode streams have no sentinel and end cleanly at end of
 *   stream, so this case does not apply to them.
 *
 * No additional fields beyond what `LlamaError` provides.
 */
export class LlamaStreamError extends LlamaError {
  /** Creates a `LlamaStreamError` with the given message and optional `cause`. */
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LlamaStreamError";
  }
}
