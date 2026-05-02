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
