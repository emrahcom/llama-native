export interface ClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

const DEFAULT_BASE_URL = "http://localhost:8080";

function normalizeBaseUrl(baseUrl: string | undefined): string {
  if (!baseUrl) return DEFAULT_BASE_URL;
  return baseUrl.replace(/\/+$/, "");
}

export class Llama {
  readonly config: {
    readonly baseUrl: string;
    readonly apiKey?: string;
  };

  constructor(options: ClientOptions = {}) {
    this.config = Object.freeze({
      baseUrl: normalizeBaseUrl(options.baseUrl),
      apiKey: options.apiKey,
    });
  }
}
