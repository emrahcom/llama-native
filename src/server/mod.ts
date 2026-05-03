import { ensureOk } from "../internal/http.ts";
import type { Config } from "../types.ts";
import type { HealthResponse } from "./types.ts";

export class Server {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async health(): Promise<HealthResponse> {
    const url = `${this.#config.baseUrl}/health`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(this.#config.apiKey
          ? { "Authorization": `Bearer ${this.#config.apiKey}` }
          : {}),
      },
    });

    await ensureOk(res, "Health check failed");

    return await res.json() as HealthResponse;
  }
}
