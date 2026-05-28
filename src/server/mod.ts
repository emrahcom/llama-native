import type { Config } from "../types/config.ts";
import { request as sendRequest } from "../request/mod.ts";

export interface HealthResponse {
  status: string;
}

export interface TokenizeRequest {
  content: string;
  add_special?: boolean;
}

export interface TokenizeResponse {
  tokens: number[];
}

export class Server {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async health(
    options?: { signal?: AbortSignal },
  ): Promise<HealthResponse> {
    return await sendRequest({
      config: this.#config,
      method: "GET",
      path: "/health",
      signal: options?.signal,
    }) as HealthResponse;
  }

  async tokenize(
    request: TokenizeRequest,
    options?: { signal?: AbortSignal },
  ): Promise<TokenizeResponse> {
    return await sendRequest({
      config: this.#config,
      method: "POST",
      path: "/tokenize",
      body: request,
      signal: options?.signal,
    }) as TokenizeResponse;
  }
}
