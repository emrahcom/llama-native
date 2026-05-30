import type { Config } from "../../types/config.ts";
import type { Usage } from "../../types/v1.ts";
import {
  request as sendRequest,
  requestStream as sendRequestStream,
} from "../../request/mod.ts";

export interface ChatCompletionsRequest {
  messages: Message[];
  model?: string;
  max_tokens?: number;
  stop?: string | string[];
  temperature?: number;
  stream?: boolean;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionsResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: Usage;
  system_fingerprint?: string;
}

export interface ChatChoice {
  index: number;
  message: AssistantMessage;
  finish_reason: "stop" | "length";
}

export interface AssistantMessage {
  role: "assistant";
  content: string;
  reasoning_content?: string;
}

export interface ChatCompletionsChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: ChatChunkChoice[];
  usage?: Usage;
  system_fingerprint?: string;
}

export interface ChatChunkChoice {
  index: number;
  delta: Delta;
  finish_reason: "stop" | "length" | null;
}

export interface Delta {
  role?: "assistant";
  content?: string | null;
  reasoning_content?: string;
}

export class Chat {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  completions(
    request: ChatCompletionsRequest & { stream: true },
    options?: { signal?: AbortSignal },
  ): AsyncIterable<ChatCompletionsChunk>;
  completions(
    request: ChatCompletionsRequest & { stream?: false | undefined },
    options?: { signal?: AbortSignal },
  ): Promise<ChatCompletionsResponse>;
  completions(
    request: ChatCompletionsRequest,
    options?: { signal?: AbortSignal },
  ): AsyncIterable<ChatCompletionsChunk> | Promise<ChatCompletionsResponse> {
    if (request.stream === true) {
      return sendRequestStream<ChatCompletionsChunk>({
        config: this.#config,
        method: "POST",
        path: "/v1/chat/completions",
        body: request,
        signal: options?.signal,
      });
    }
    return sendRequest({
      config: this.#config,
      method: "POST",
      path: "/v1/chat/completions",
      body: request,
      signal: options?.signal,
    }) as Promise<ChatCompletionsResponse>;
  }
}
