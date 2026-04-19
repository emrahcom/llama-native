import type { ClientOptions, Config } from "./types.ts";
import { Server } from "./server/mod.ts";
import { Chat } from "./chat/mod.ts";

export class Client {
  #config: Config;
  server: Server;
  chat: Chat;

  constructor(options: ClientOptions = {}) {
    const host = options.host?.replace(/\/+$/, "") || "http://localhost";
    const port = options.port || 8080;

    this.#config = {
      baseUrl: `${host}:${port}`,
      apiKey: options.apiKey,
    };

    this.server = new Server(this.#config);
    this.chat = new Chat(this.#config);
  }

  get config(): Config {
    return this.#config;
  }
}

export type { ClientOptions };
