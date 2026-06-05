// Generates a text completion for a prompt via POST /v1/completions.
//
// Run against a local server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env examples/v1-completions.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/v1-completions.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

// Non-streaming: await a single V1CompletionsResponse.
const result = await llama.v1.completions({
  prompt: "The capital of France is",
  max_tokens: 1024,
});
console.log(result.choices[0].text);

// Streaming: set stream: true to receive an AsyncIterable of chunks. Each
// chunk's text is a delta; concatenate them to reconstruct the full output.
const stream = llama.v1.completions({
  prompt: "The capital of France is",
  max_tokens: 1024,
  stream: true,
});
for await (const chunk of stream) {
  await Deno.stdout.write(new TextEncoder().encode(chunk.choices[0].text));
}
console.log();
