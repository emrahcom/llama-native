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

/** Options for creating embeddings. */
export interface EmbeddingOptions {
  /** The input text to embed. Can be a string or an array of strings. */
  input: string | string[];
  /** The ID of the model to use. */
  model?: string;
}

/** The response from the embeddings endpoint. */
export interface EmbeddingResponse {
  object: "list";
  data: {
    object: "embedding";
    /** The vector representation of the input. */
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
export interface NativeCompletionOptions {
  /** The prompt to generate text from. */
  prompt: string;
  /** Force the output to follow a specific GBNF grammar. */
  grammar?: string;
  /** Number of tokens to predict. -1 = infinity, -2 = until context filled. */
  n_predict?: number;
  /** Whether to stream the response. */
  stream?: boolean;
  /** Temperature for sampling. */
  temp?: number;
  /** Stop sequences to end generation. */
  stop?: string[];
  /** Penalty for repeating tokens. */
  repeat_penalty?: number;
  /** Only sample from the top K options. */
  top_k?: number;
  /** Only sample from the top P options. */
  top_p?: number;
  /** Other native parameters (n_probs, min_p, etc.) */
  [key: string]: unknown;
}

/** The detailed response from the native completion */
export interface NativeCompletionResponse {
  /** The generated text result. */
  content: string;
  model: string;
  prompt: string;
  /** Indicates if generation stopped due to EOS token. */
  stopped_eos: boolean;
  /** Indicates if generation stopped due to token limit. */
  stopped_limit: boolean;
  /** Indicates if generation stopped due to a stop word. */
  stopped_word: boolean;
  /** The word that triggered the stop. */
  stopping_word: string;
  /** Detailed performance metrics. */
  timings: {
    predicted_ms: number;
    predicted_n: number;
    predicted_per_token_ms: number;
    predicted_per_second: number;
    prompt_ms: number;
    prompt_n: number;
    prompt_per_token_ms: number;
    prompt_per_second: number;
  };
  /** Whether the context size was exceeded. */
  truncated: boolean;
  /** Number of tokens evaluated from the prompt. */
  tokens_evaluated: number;
}

/** The response for the tokenize endpoint */
export interface TokenizeResponse {
  tokens: number[];
}

/** The response for the detokenize endpoint. */
export interface DetokenizeResponse {
  content: string;
}
