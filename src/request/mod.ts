import type { Config } from "../types/config.ts";
import { LlamaError, LlamaHTTPError, LlamaStreamError } from "../errors/mod.ts";

export interface RequestOptions {
  config: Config;
  method: string;
  path: string;
  body?: unknown;
  signal?: AbortSignal;
}

function resolvePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildInit(options: RequestOptions): RequestInit {
  const { config, method, body, signal } = options;

  const headers: Record<string, string> = {};
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  if (signal !== undefined) {
    init.signal = signal;
  }
  return init;
}

async function sendRequest(options: RequestOptions): Promise<Response> {
  const { config, method } = options;
  const path = resolvePath(options.path);
  try {
    return await fetch(`${config.baseUrl}${path}`, buildInit(options));
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }
    throw new LlamaError(`${method} ${path} request failed`, { cause });
  }
}

async function readErrorBody(response: Response): Promise<unknown> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function httpError(
  response: Response,
  method: string,
  path: string,
): Promise<LlamaHTTPError> {
  const errorBody = await readErrorBody(response);
  return new LlamaHTTPError(
    `HTTP ${response.status} from ${method} ${path}`,
    response.status,
    errorBody,
  );
}

export async function request(options: RequestOptions): Promise<unknown> {
  const { method } = options;
  const path = resolvePath(options.path);

  const response = await sendRequest(options);

  if (!response.ok) {
    throw await httpError(response, method, path);
  }

  try {
    return await response.json();
  } catch (cause) {
    throw new LlamaError(
      `Failed to parse ${method} ${path} response body`,
      { cause },
    );
  }
}

// Extracts the joined `data:` payload from one SSE event, or `null` when the
// event carries no `data:` lines. A single leading space after `data:` is
// stripped; multiple `data:` lines are joined with `\n`.
function eventDataPayload(rawEvent: string): string | null {
  const dataLines: string[] = [];
  for (const line of rawEvent.split("\n")) {
    if (line.startsWith("data:")) {
      let payload = line.slice("data:".length);
      if (payload.startsWith(" ")) {
        payload = payload.slice(1);
      }
      dataLines.push(payload);
    }
  }
  return dataLines.length === 0 ? null : dataLines.join("\n");
}

export async function* requestStream<T>(
  options: RequestOptions,
): AsyncGenerator<T> {
  const { method } = options;
  const path = resolvePath(options.path);

  const response = await sendRequest(options);

  if (!response.ok) {
    throw await httpError(response, method, path);
  }

  if (response.body === null) {
    throw new LlamaStreamError("Stream ended without [DONE] marker");
  }

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .getReader();

  let buffer = "";
  try {
    while (true) {
      let result: ReadableStreamReadResult<string>;
      try {
        result = await reader.read();
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          throw cause;
        }
        throw new LlamaError(`${method} ${path} stream failed`, { cause });
      }
      if (result.done) {
        break;
      }

      buffer += result.value;

      let separator: number;
      while ((separator = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);

        const payload = eventDataPayload(rawEvent);
        if (payload === null) {
          continue;
        }
        if (payload === "[DONE]") {
          return;
        }

        let value: T;
        try {
          value = JSON.parse(payload) as T;
        } catch (cause) {
          throw new LlamaStreamError("Failed to parse stream chunk", { cause });
        }
        yield value;
      }
    }

    throw new LlamaStreamError("Stream ended without [DONE] marker");
  } finally {
    // Cancel (not just release) so an early consumer break propagates upstream
    // through the TextDecoderStream to response.body and closes the underlying
    // connection rather than leaving it open until garbage collection. On an
    // errored stream cancel() rejects with the stored error; swallow it so it
    // cannot mask the error already thrown from the loop above.
    await reader.cancel().catch(() => {});
  }
}
