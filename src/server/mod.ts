import type { Config } from "../types/config.ts";
import { LlamaError, LlamaHTTPError } from "../errors/mod.ts";

export interface HealthResponse {
  status: string;
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

export class Server {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async health(): Promise<HealthResponse> {
    const headers: Record<string, string> = {};
    if (this.#config.apiKey) {
      headers.Authorization = `Bearer ${this.#config.apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(`${this.#config.baseUrl}/health`, {
        method: "GET",
        headers,
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        throw cause;
      }
      throw new LlamaError("GET /health request failed", { cause });
    }

    if (!response.ok) {
      const body = await readErrorBody(response);
      throw new LlamaHTTPError(
        `HTTP ${response.status} from GET /health`,
        response.status,
        body,
      );
    }

    try {
      return await response.json() as HealthResponse;
    } catch (cause) {
      throw new LlamaError("Failed to parse GET /health response body", {
        cause,
      });
    }
  }
}
