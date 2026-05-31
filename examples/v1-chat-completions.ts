// Generates a chat completion from a list of messages via
// POST /v1/chat/completions.
//
// Run against a local server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env examples/v1-chat-completions.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/v1-chat-completions.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

const messages = [
  { role: "system", content: "You are a helpful assistant." },
  { role: "user", content: "What is the capital of France?" },
] as const;

// Non-streaming: await a single ChatCompletionsResponse.
const result = await llama.v1.chat.completions({
  messages: [...messages],
  max_tokens: 16,
});
console.log(result.choices[0].message.content);

// Streaming: set stream: true to receive an AsyncIterable of chunks. Each
// chunk's delta.content is a fragment; concatenate them across chunks to
// reconstruct the full reply.
const stream = llama.v1.chat.completions({
  messages: [...messages],
  max_tokens: 16,
  stream: true,
});
for await (const chunk of stream) {
  const content = chunk.choices[0].delta.content;
  if (content) {
    await Deno.stdout.write(new TextEncoder().encode(content));
  }
}
console.log();
