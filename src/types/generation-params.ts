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
}
