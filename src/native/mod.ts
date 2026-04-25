import type {
  Config,
  DetokenizeResponse,
  NativeCompletionOptions,
  NativeCompletionResponse,
  TokenizeResponse,
} from "../types.ts";

export class Native {
  #config: Config;

  constructor(config: Config) {
    this.#config = config;
  }

  async completion(
    options: NativeCompletionOptions,
  ): Promise<NativeCompletionResponse> {
    const url = `${this.#config.baseUrl}/completion`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.#config.apiKey
          ? { "Authorization": `Bearer ${this.#config.apiKey}` }
          : {}),
      },
      body: JSON.stringify(options),
    });

    if (!res.ok) {
      throw new Error(`Native completion failed: ${res.status}`);
    }

    return await res.json();
  }

  // Converts a string into a list of token IDs specific to the loaded model.
  async tokenize(content: string): Promise<TokenizeResponse> {
    const url = `${this.#config.baseUrl}/tokenize`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens }),
    });

    if (!res.ok) {
      throw new Error(`Detokenization failed: ${res.status}`);
    }

    return await res.json();
  }
}
