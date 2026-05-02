/** Native completion options unique to llama.cpp */
export interface NativeOptions {
  prompt: string | number[];
  grammar?: string;
  n_predict?: number;
  stream?: boolean;
  temp?: number;
  stop?: string[];
  repeat_penalty?: number;
  top_k?: number;
  top_p?: number;
  min_p?: number;
  seed?: number;
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
