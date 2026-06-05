/** Token counts for a request. */
export interface V1Usage {
  /** Tokens in the input prompt. */
  prompt_tokens: number;
  /** Tokens in the generated text. */
  completion_tokens: number;
  /** Sum of `prompt_tokens` and `completion_tokens`. */
  total_tokens: number;
  /** Breakdown of the prompt tokens, when reported. */
  prompt_tokens_details?: {
    /** Prompt tokens served from cache. */
    cached_tokens: number;
  };
}
