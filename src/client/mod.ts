import { Server } from "../server/mod.ts";

export interface ClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export interface Config {
  readonly baseUrl: string;
  readonly apiKey?: string;
}

const DEFAULT_BASE_URL = "http://localhost:8080";

function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (!baseUrl) return DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

export class Llama {
  readonly config: Config;
  readonly server: Server;

  constructor(options: ClientOptions = {}) {
    this.config = Object.freeze({
      baseUrl: normalizeBaseUrl(options.baseUrl),
      apiKey: options.apiKey,
    });
    this.server = new Server(this.config);
  }
}
