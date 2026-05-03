import { ensureOk } from "../../internal/http.ts";
import type { Config } from "../../types.ts";
import type { ModelsResponse } from "./types.ts";

export class Models {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async list(): Promise<ModelsResponse> {
    const url = `${this.#config.baseUrl}/v1/models`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(this.#config.apiKey
          ? { "Authorization": `Bearer ${this.#config.apiKey}` }
          : {}),
      },
    });

    await ensureOk(res, "Failed to list models");

    return await res.json() as ModelsResponse;
  }
}
