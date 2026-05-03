import { TextLineStream } from "@std/streams";
import { ensureOk } from "../../internal/http.ts";
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

    await ensureOk(res, "Chat completion failed");

    return await res.json() as ChatResponse;
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

    await ensureOk(res, "Chat streaming failed");

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
