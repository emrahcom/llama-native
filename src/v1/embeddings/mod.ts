import { ensureOk } from "../../internal/http.ts";
import type { Config } from "../../types.ts";
import type { EmbeddingOptions, EmbeddingResponse } from "./types.ts";

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

    await ensureOk(res, "Embedding creation failed");

    return await res.json() as EmbeddingResponse;
  }
}
