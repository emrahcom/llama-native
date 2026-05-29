// Tokenizes input text into model token IDs via POST /tokenize.
//
// Run against a local server on the default http://localhost:8080:
//
//   deno run --allow-net examples/tokenize.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/tokenize.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

const result = await llama.tokenize({
  content: "Hello, world!",
  add_special: true,
});
console.log(result.tokens);
