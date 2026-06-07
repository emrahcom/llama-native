// Converts model token IDs back into text via POST /detokenize, the inverse of
// /tokenize.
//
// Run against a local server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env examples/detokenize.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/detokenize.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

// Token IDs are model-specific, so obtain a valid set from /tokenize first,
// then convert them back to text.
const { tokens } = await llama.tokenize({ content: "Hello, world!" });
const result = await llama.detokenize({ tokens });
console.log(result.content);
