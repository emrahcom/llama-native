import type { Config, HealthResponse } from "../types.ts";

export class Server {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async health(): Promise<HealthResponse> {
    const url = `${this.#config.baseUrl}/health`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Health check failed: ${res.status}`);
    }

    return await res.json();
  }
}
