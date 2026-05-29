import type { Config } from "../types/config.ts";
import { request as sendRequest } from "../request/mod.ts";
import { V1 } from "../v1/mod.ts";

export interface LlamaOptions {
  baseUrl?: string;
  apiKey?: string;
}

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

const DEFAULT_BASE_URL = "http://localhost:8080";

function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (!baseUrl) return DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

export class Llama {
  readonly config: Config;
  readonly v1: V1;

  constructor(options: LlamaOptions = {}) {
    this.config = Object.freeze({
      baseUrl: normalizeBaseUrl(options.baseUrl),
      apiKey: options.apiKey,
    });
    this.v1 = new V1(this.config);
  }

  async health(
    options?: { signal?: AbortSignal },
  ): Promise<HealthResponse> {
    return await sendRequest({
      config: this.config,
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
      config: this.config,
      method: "POST",
      path: "/tokenize",
      body: request,
      signal: options?.signal,
    }) as TokenizeResponse;
  }
}
