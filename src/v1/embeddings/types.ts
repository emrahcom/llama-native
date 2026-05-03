/** Options for creating embeddings. */
export interface EmbeddingOptions {
  input: string | string[] | number | number[];
  model?: string;
  dimensions?: number;
  encoding_format?: "float" | "base64";
  user?: string;
}

/** The response from the embeddings endpoint. */
export interface EmbeddingResponse {
  data: {
    embedding: number[];
    index: number;
    object: "embedding";
  }[];
  model: string;
  object: "list";
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
