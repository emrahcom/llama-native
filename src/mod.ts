import type { ClientOptions, Config } from "./types.ts";
import { Server } from "./server/mod.ts";

export class Client {
  #config: Config;
  server: Server;

  constructor(options: ClientOptions = {}) {
    const host = options.host?.replace(/\/+$/, "") || "http://localhost";
    const port = options.port || 8080;

    this.#config = {
      baseUrl: `${host}:${port}`,
      apiKey: options.apiKey,
    };

    this.server = new Server(this.#config);
  }

  get config(): Config {
    return this.#config;
  }
}

export type { ClientOptions };
