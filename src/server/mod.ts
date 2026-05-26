export interface HealthResponse {
  status: string;
}

interface ServerConfig {
  readonly baseUrl: string;
  readonly apiKey?: string;
}

export class Server {
  #config: ServerConfig;

  constructor(config: ServerConfig) {
    this.#config = config;
  }

  async health(): Promise<HealthResponse> {
    const headers: Record<string, string> = {};
    if (this.#config.apiKey) {
      headers.Authorization = `Bearer ${this.#config.apiKey}`;
    }

    const response = await fetch(`${this.#config.baseUrl}/health`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`GET /health failed with status ${response.status}`);
    }

    return await response.json() as HealthResponse;
  }
}
