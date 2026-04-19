/** Options for initializing the llama.cpp client. */
export interface ClientOptions {
  /**
   * The server host.
   * @default "http://localhost"
   */
  host?: string;

  /**
   * The server port.
   * @default 8080
   */
  port?: number;

  /**
   * Optional API Key if using a proxy or protected server.
   */
  apiKey?: string;
}

// Internal config used by submodules to avoid repeat logic.
export interface Config {
  baseUrl: string;
  apiKey?: string;
}

// The health status of the llama.cpp server.
export interface HealthResponse {
  status: string;
}
