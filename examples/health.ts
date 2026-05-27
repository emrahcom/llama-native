// Checks readiness of a running llama-server via GET /health.
//
// Run against a local server on the default http://localhost:8080:
//
//   deno run --allow-net examples/health.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/health.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

const health = await llama.server.health();
console.log(health.status);
