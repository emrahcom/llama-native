/** A single message in a chat conversation. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** The chat completion choice. */
export interface ChatChoice {
  finish_reason: "stop" | "length" | "content_filter" | string | null;
  index: number;
  message: ChatMessage;
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
  choices: ChatChoice[];
  object: "chat.completion";
  created: number;
  model: string;
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
