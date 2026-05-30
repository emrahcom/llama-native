/** Token counts for a request. */
export interface Usage {
  /** Tokens in the input prompt. */
  prompt_tokens: number;
  /** Tokens in the generated text. */
  completion_tokens: number;
  /** Sum of `prompt_tokens` and `completion_tokens`. */
  total_tokens: number;
}
