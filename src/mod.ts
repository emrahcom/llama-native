import { Chat } from "./chat/mod.ts";
import { Embeddings } from "./embeddings/mod.ts";
import { Models } from "./models/mod.ts";
import { Native } from "./native/mod.ts";
import { Server } from "./server/mod.ts";
import type { ClientOptions, Config } from "./types.ts";

export class Llama {
  #config: Config;
  chat: Chat;
  embeddings: Embeddings;
  models: Models;
  native: Native;
  server: Server;

  constructor(options: ClientOptions = {}) {
    const host = options.host?.replace(/\/+$/, "") || "http://localhost";
    const port = options.port || 8080;

    this.#config = {
      baseUrl: `${host}:${port}`,
      apiKey: options.apiKey,
    };

    this.chat = new Chat(this.#config);
    this.embeddings = new Embeddings(this.#config);
    this.models = new Models(this.#config);
    this.native = new Native(this.#config);
    this.server = new Server(this.#config);
  }

  get config(): Config {
    return this.#config;
  }
}

export { Llama as Client };
export * from "./types.ts";
export type { ClientOptions };
