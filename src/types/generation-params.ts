/**
 * Request parameters shared by the generation endpoints (`/v1/completions` and
 * `/v1/chat/completions`). Each endpoint's request composes this type with
 * `extends` instead of re-declaring the fields. All fields are optional; an
 * omitted field uses the llama-server default.
 */
export interface GenerationParams {
  /** Model identifier; when omitted, llama-server uses its loaded model. */
  model?: string;
  /** Maximum number of tokens to generate. */
  max_tokens?: number;
  /** Stop generation when any of these strings is produced. */
  stop?: string | string[];
  /** Sampling temperature; higher is more random, lower is more deterministic. */
  temperature?: number;
  /**
   * Top-k sampling: considers only the k most probable tokens. Lower values
   * make output more focused, higher values more diverse.
   */
  top_k?: number;
  /**
   * Nucleus (top-p) sampling: considers the smallest set of tokens whose
   * cumulative probability reaches this value. Lower values make output more
   * focused.
   */
  top_p?: number;
  /**
   * Min-p sampling: discards tokens less probable than this fraction of the
   * most probable token's probability. Higher values make output more focused.
   */
  min_p?: number;
  /**
   * Presence penalty: penalizes tokens that have already appeared at all,
   * regardless of count, encouraging new topics. Higher values reduce
   * repetition.
   */
  presence_penalty?: number;
  /**
   * Frequency penalty: penalizes tokens in proportion to how often they have
   * already appeared. Higher values reduce repetition.
   */
  frequency_penalty?: number;
  /**
   * Repeat penalty: a multiplicative penalty on recently repeated tokens.
   * Values above 1 reduce repetition; 1 applies no penalty.
   */
  repeat_penalty?: number;
  /**
   * Random seed for the sampler. Set a fixed value for reproducible output
   * across requests with identical parameters.
   */
  seed?: number;
}
