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

/** Internal config used by submodules to avoid repeat logic. */
export interface Config {
  baseUrl: string;
  apiKey?: string;
}

/** The health status of the llama.cpp server. */
export interface HealthResponse {
  status: string;
}

/** A single message in a chat conversation. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Options for creating a chat completion. */
export interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/** The response from the chat completion endpoint. */
export interface ChatResponse {
  choices: {
    message: ChatMessage;
    finish_reason: "stop" | "length" | "content_filter" | "null" | string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** A chunk of a streaming chat completion. */
export interface ChatResponseChunk {
  choices: {
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason:
      | "stop"
      | "length"
      | "content_filter"
      | "null"
      | string
      | null;
  }[];
}
