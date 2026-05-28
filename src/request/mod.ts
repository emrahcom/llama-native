import type { Config } from "../types/config.ts";
import { LlamaError, LlamaHTTPError } from "../errors/mod.ts";

export interface RequestOptions {
  config: Config;
  method: string;
  path: string;
  body?: unknown;
  signal?: AbortSignal;
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

export async function request(options: RequestOptions): Promise<unknown> {
  const { config, method, body, signal } = options;
  const path = options.path.startsWith("/") ? options.path : `/${options.path}`;

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

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, init);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }
    throw new LlamaError(`${method} ${path} request failed`, { cause });
  }

  if (!response.ok) {
    const errorBody = await readErrorBody(response);
    throw new LlamaHTTPError(
      `HTTP ${response.status} from ${method} ${path}`,
      response.status,
      errorBody,
    );
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
