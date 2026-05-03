import { TextLineStream } from "@std/streams";
import type { Config } from "../../types.ts";
import type { ChatChunk, ChatOptions, ChatResponse } from "./types.ts";

export class Chat {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async create(options: ChatOptions): Promise<ChatResponse> {
    const url = `${this.#config.baseUrl}/v1/chat/completions`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.#config.apiKey
          ? { "Authorization": `Bearer ${this.#config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({ ...options, stream: false }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(data);
      throw new Error(`Chat completion failed: ${res.status}`);
    }

    return data as ChatResponse;
  }

  async *stream(options: ChatOptions): AsyncIterableIterator<ChatChunk> {
    const url = `${this.#config.baseUrl}/v1/chat/completions`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.#config.apiKey
          ? { "Authorization": `Bearer ${this.#config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({ ...options, stream: true }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`Chat streaming failed: ${res.status}`);
    }

    const lines = res.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());

    for await (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const data = line.slice(6);
      if (data === "[DONE]") break;

      try {
        yield JSON.parse(data) as ChatChunk;
      } catch {
        // Ignore parsing errors for empty lines
      }
    }
  }
}
