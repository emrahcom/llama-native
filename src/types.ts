/** Configuration for the LlamaClient. */
export interface LlamaConfig {
  /**
   * The server host.
   * @default "http://localhost"
   */
  host?: string;

  /**
   * The server port.
   *  @default 8080
   */
  port?: number;

  /**
   * Optional API Key if using a proxy or protected server.
   */
  apiKey?: string;
}

// Internal version used by submodules to avoid repeat logic.
export interface InternalConfig {
  baseUrl: string;
  apiKey?: string;
}
