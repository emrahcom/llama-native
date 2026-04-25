import type { Config, EmbeddingOptions, EmbeddingResponse } from "../types.ts";

export class Embeddings {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async create(options: EmbeddingOptions): Promise<EmbeddingResponse> {
    const url = `${this.#config.baseUrl}/v1/embeddings`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.#config.apiKey
          ? { "Authorization": `Bearer ${this.#config.apiKey}` }
          : {}),
      },
      body: JSON.stringify(options),
    });

    if (!res.ok) {
      throw new Error(`Embedding creation failed: ${res.status}`);
    }

    return await res.json();
  }
}
