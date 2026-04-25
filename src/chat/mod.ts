import { TextLineStream } from "@std/streams";
import type {
  ChatOptions,
  ChatResponse,
  ChatResponseChunk,
  Config,
} from "../types.ts";

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

    if (!res.ok) {
      throw new Error(`Chat completion failed: ${res.status}`);
    }

    return await res.json();
  }

  async *createStream(
    options: ChatOptions,
  ): AsyncIterableIterator<ChatResponseChunk> {
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
      throw new Error(`Streaming failed: ${res.status}`);
    }

    // Transform the raw bytes into lines of text
    const lines = res.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());

    for await (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const data = line.slice(6);
      if (data === "[DONE]") break;

      try {
        yield JSON.parse(data) as ChatResponseChunk;
      } catch {
        // Ignore parsing errors for empty lines
      }
    }
  }
}
