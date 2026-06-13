// Generates embedding vectors for one or more inputs via POST /embedding,
// llama-server's native embeddings endpoint.
//
// The server must be started with `--embedding`. The `--pooling` type chosen at
// launch shapes the output: `--pooling none` yields one vector per token, while
// a pooling type such as `--pooling mean` yields a single pooled vector per
// input. See the server requirements in specs/endpoints/embedding.md.
//
// Run against such a server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env examples/embedding-basic.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/embedding-basic.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

// The response is a bare array with one entry per input. Each entry's
// `embedding` is a two-dimensional array: one inner vector per token under
// `--pooling none`, or a single pooled inner vector otherwise.
const single = await llama.embedding({
  content: "The capital of France is Paris.",
});
console.log(single[0].embedding.length);

// An array of inputs is embedded in one request (a batch). Each entry's index
// matches the position of its input.
const batch = await llama.embedding({
  content: ["The first sentence.", "The second sentence."],
});
for (const entry of batch) {
  console.log(entry.index, entry.embedding.length);
}
