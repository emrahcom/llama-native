/** Options for initializing the llama.cpp client. */
export interface ClientOptions {
  /**
   * The full base URL of the llama.cpp server.
   * @default "http://localhost:8080"
   */
  baseUrl?: string;

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
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: {
    index: number;
    message: ChatMessage;
    finish_reason: "stop" | "length" | "content_filter" | string | null;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** A chunk of a streaming chat completion. */
export interface ChatChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: "assistant";
      content?: string;
    };
    finish_reason:
      | "stop"
      | "length"
      | "content_filter"
      | string
      | null;
  }[];
}

/** Options for creating embeddings. */
export interface EmbeddingOptions {
  input: string | string[];
  model?: string;
}

/** The response from the embeddings endpoint. */
export interface EmbeddingResponse {
  object: "list";
  data: {
    object: "embedding";
    embedding: number[];
    index: number;
  }[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/** Information about a loaded model. */
export interface Model {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
}

/** The response from the models list endpoint. */
export interface ModelsResponse {
  object: "list";
  data: Model[];
}

/** Native completion options unique to llama.cpp */
export interface NativeOptions {
  prompt: string;
  grammar?: string;
  n_predict?: number;
  stream?: boolean;
  temp?: number;
  stop?: string[];
  repeat_penalty?: number;
  top_k?: number;
  top_p?: number;
  [key: string]: unknown;
}

/** Timings interface for native responses */
export interface NativeTimings {
  predicted_ms: number;
  predicted_n: number;
  predicted_per_token_ms: number;
  predicted_per_second: number;
  prompt_ms: number;
  prompt_n: number;
  prompt_per_token_ms: number;
  prompt_per_second: number;
}

/** The detailed response from the native completion */
export interface NativeResponse {
  content: string;
  model: string;
  prompt: string;
  stopped_eos: boolean;
  stopped_limit: boolean;
  stopped_word: boolean;
  stopping_word: string;
  timings: NativeTimings;
  truncated: boolean;
  tokens_evaluated: number;
}

/** A single chunk of a native completion stream. */
export interface NativeChunk {
  content: string;
  stop: boolean;
  timings?: NativeTimings;
}

/** The response for the tokenize endpoint */
export interface TokenizeResponse {
  tokens: number[];
}

/** The response for the detokenize endpoint. */
export interface DetokenizeResponse {
  content: string;
}
