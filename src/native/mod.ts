import { TextLineStream } from "@std/streams";
import type {
  Config,
  DetokenizeResponse,
  NativeChunk,
  NativeOptions,
  NativeResponse,
  TokenizeResponse,
} from "../types.ts";

export class Native {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async create(options: NativeOptions): Promise<NativeResponse> {
    const url = `${this.#config.baseUrl}/completion`;

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
      throw new Error(`Native completion failed: ${res.status}`);
    }

    return await res.json();
  }

  async *stream(options: NativeOptions): AsyncGenerator<NativeChunk> {
    const url = `${this.#config.baseUrl}/completion`;

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
      throw new Error(`Native streaming failed: ${res.status}`);
    }

    const lines = res.body
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream());

    for await (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const data = JSON.parse(trimmed) as NativeChunk;
        yield data;
        if (data.stop) break;
      } catch {
        // Skip partial chunks
      }
    }
  }

  // Converts a string into a list of token IDs specific to the loaded model.
  async tokenize(content: string): Promise<TokenizeResponse> {
    const url = `${this.#config.baseUrl}/tokenize`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.#config.apiKey
          ? { "Authorization": `Bearer ${this.#config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      throw new Error(`Tokenization failed: ${res.status}`);
    }

    return await res.json();
  }

  // Converts a list of token IDs back into human-readable text.
  async detokenize(tokens: number[]): Promise<DetokenizeResponse> {
    const url = `${this.#config.baseUrl}/detokenize`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.#config.apiKey
          ? { "Authorization": `Bearer ${this.#config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({ tokens }),
    });

    if (!res.ok) {
      throw new Error(`Detokenization failed: ${res.status}`);
    }

    return await res.json();
  }
}
