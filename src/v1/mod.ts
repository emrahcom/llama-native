import type { Config } from "../types/config.ts";
import type { Usage } from "../types/v1.ts";
import {
  request as sendRequest,
  requestStream as sendRequestStream,
} from "../request/mod.ts";

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
  stream?: boolean;
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

export interface CompletionsChunk {
  id: string;
  object: "text_completion";
  created: number;
  model: string;
  choices: ChunkChoice[];
  usage?: Usage;
  system_fingerprint?: string;
}

export interface ChunkChoice {
  index: number;
  text: string;
  logprobs: null;
  finish_reason: "stop" | "length" | null;
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

  completions(
    request: CompletionsRequest & { stream: true },
    options?: { signal?: AbortSignal },
  ): AsyncIterable<CompletionsChunk>;
  completions(
    request: CompletionsRequest & { stream?: false | undefined },
    options?: { signal?: AbortSignal },
  ): Promise<CompletionsResponse>;
  completions(
    request: CompletionsRequest,
    options?: { signal?: AbortSignal },
  ): AsyncIterable<CompletionsChunk> | Promise<CompletionsResponse> {
    if (request.stream === true) {
      return sendRequestStream<CompletionsChunk>({
        config: this.#config,
        method: "POST",
        path: "/v1/completions",
        body: request,
        signal: options?.signal,
      });
    }
    return sendRequest({
      config: this.#config,
      method: "POST",
      path: "/v1/completions",
      body: request,
      signal: options?.signal,
    }) as Promise<CompletionsResponse>;
  }
}
