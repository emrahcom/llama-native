// Generates a text completion for a prompt via POST /completion, llama-server's
// native completion API, shown non-streaming and streaming.
//
// Run against a local server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env examples/completion-basic.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/completion-basic.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

// Non-streaming: await a single CompletionResponse.
const result = await llama.completion({
  prompt: "The capital of France is",
  n_predict: 1024,
});
console.log(result.content);

// Streaming: set stream: true to receive an AsyncIterable of chunks. Each
// chunk's content is a delta; concatenate them to reconstruct the full output.
// Native streams send no [DONE] sentinel; the stream ends after the stop: true
// chunk.
const stream = llama.completion({
  prompt: "The capital of France is",
  n_predict: 1024,
  stream: true,
});
for await (const chunk of stream) {
  await Deno.stdout.write(new TextEncoder().encode(chunk.content));
}
console.log();
