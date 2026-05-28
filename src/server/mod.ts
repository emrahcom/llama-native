import type { Config } from "../types/config.ts";
import { request } from "../request/mod.ts";

export interface HealthResponse {
  status: string;
}

export class Server {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async health(
    options?: { signal?: AbortSignal },
  ): Promise<HealthResponse> {
    return await request({
      config: this.#config,
      method: "GET",
      path: "/health",
      signal: options?.signal,
    }) as HealthResponse;
  }
}
