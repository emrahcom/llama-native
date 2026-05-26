import type { Config } from "../client/mod.ts";

export interface HealthResponse {
  status: string;
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

    const response = await fetch(`${this.#config.baseUrl}/health`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`GET /health failed with status ${response.status}`);
    }

    return await response.json() as HealthResponse;
  }
}
