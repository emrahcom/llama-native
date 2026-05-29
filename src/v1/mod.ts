import type { Config } from "../types/config.ts";
import { request as sendRequest } from "../request/mod.ts";

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

export interface CompletionsRequest {
  prompt: string | string[] | number[] | number[][];
  model?: string;
  max_tokens?: number;
  stop?: string | string[];
  temperature?: number;
}

export interface CompletionsResponse {
  id: string;
  object: "text_completion";
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
  system_fingerprint?: string;
}

export interface Choice {
  index: number;
  text: string;
  logprobs: null;
  finish_reason: "stop" | "length";
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export class V1 {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async models(
    options?: { signal?: AbortSignal },
  ): Promise<ModelsResponse> {
    return await sendRequest({
      config: this.#config,
      method: "GET",
      path: "/v1/models",
      signal: options?.signal,
    }) as ModelsResponse;
  }

  async completions(
    request: CompletionsRequest,
    options?: { signal?: AbortSignal },
  ): Promise<CompletionsResponse> {
    return await sendRequest({
      config: this.#config,
      method: "POST",
      path: "/v1/completions",
      body: request,
      signal: options?.signal,
    }) as CompletionsResponse;
  }
}
