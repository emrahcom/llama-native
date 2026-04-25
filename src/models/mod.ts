import type { Config, ModelsResponse } from "../types.ts";

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
        ...(this.#config.apiKey
          ? { "Authorization": `Bearer ${this.#config.apiKey}` }
          : {}),
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to list models: ${res.status}`);
    }

    return await res.json();
  }
}
