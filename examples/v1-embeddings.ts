// Generates embedding vectors for one or more inputs via POST /v1/embeddings.
//
// The server must be started with both `--embedding` and a pooling type other
// than `none`, e.g. `llama-server ... --embedding --pooling mean`. See the
// server requirements in specs/endpoints/v1-embeddings.md.
//
// Run against such a server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env examples/v1-embeddings.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/v1-embeddings.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

// A single input produces one embedding vector.
const single = await llama.v1.embeddings({
  input: "The capital of France is Paris.",
});
console.log(single.data[0].embedding.length);

// An array of inputs is embedded in one request (a batch). Each entry's index
// matches the position of its input.
const batch = await llama.v1.embeddings({
  input: ["The first sentence.", "The second sentence."],
});
for (const embedding of batch.data) {
  console.log(embedding.index, embedding.embedding.length);
}
