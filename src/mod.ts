import { Embeddings } from "./embeddings/mod.ts";
import { Native } from "./native/mod.ts";
import { Server } from "./server/mod.ts";
import { Chat as ChatV1 } from "./v1/chat/mod.ts";
import { Models as ModelsV1 } from "./v1/models/mod.ts";
import type { ClientOptions, Config, HealthResponse } from "./types.ts";

export class Llama {
  #config: Config;
  embeddings: Embeddings;
  native: Native;
  server: Server;
  v1: {
    chat: ChatV1;
    models: ModelsV1;
  };

  constructor(options: ClientOptions = {}) {
    const url = (options.baseUrl || "http://localhost:8080").replace(
      /\/+$/,
      "",
    );

    this.#config = {
      baseUrl: url,
      apiKey: options.apiKey,
    };

    this.embeddings = new Embeddings(this.#config);
    this.native = new Native(this.#config);
    this.server = new Server(this.#config);
    this.v1 = {
      chat: new ChatV1(this.#config),
      models: new ModelsV1(this.#config),
    };
  }

  get config(): Config {
    return this.#config;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const res = await this.server.health();
      return res.status === "ok";
    } catch {
      return false;
    }
  }

  async health(): Promise<HealthResponse> {
    return await this.server.health();
  }
}

export { Llama as Client };
export * as utils from "./utils/mod.ts";
export type * from "./types.ts";
