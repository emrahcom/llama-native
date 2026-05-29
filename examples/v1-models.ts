// Lists the models available on the server via GET /v1/models.
//
// Run against a local server on the default http://localhost:8080:
//
//   deno run --allow-net examples/v1-models.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/v1-models.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

const result = await llama.v1.models();
for (const model of result.data) {
  console.log(model.id);
}
