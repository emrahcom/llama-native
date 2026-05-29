import type { Config } from "../types/config.ts";
import { request } from "../request/mod.ts";

export interface Model {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
}

export interface ModelsResponse {
  object: "list";
  data: Model[];
}

export class V1 {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async models(
    options?: { signal?: AbortSignal },
  ): Promise<ModelsResponse> {
    return await request({
      config: this.#config,
      method: "GET",
      path: "/v1/models",
      signal: options?.signal,
    }) as ModelsResponse;
  }
}
