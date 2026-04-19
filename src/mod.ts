import type { InternalConfig, LlamaConfig } from "./types.ts";

export class LlamaClient {
  #config: InternalConfig;

  constructor(config: LlamaConfig = {}) {
    const host = config.host?.replace(/\/+$/, "") || "http://localhost";
    const port = config.port || 8080;

    this.#config = {
      baseUrl: `${host}:${port}`,
      apiKey: config.apiKey,
    };
  }

  get config(): InternalConfig {
    return this.#config;
  }
}

export type { LlamaConfig };
