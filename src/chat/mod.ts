import type { ChatOptions, ChatResponse, Config } from "../types.ts";

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
      body: JSON.stringify(options),
    });

    if (!res.ok) {
      throw new Error(`Chat completion failed: ${res.status}`);
    }

    return await res.json();
  }
}
