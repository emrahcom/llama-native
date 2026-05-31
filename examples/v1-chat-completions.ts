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
// reasoning_content is present for reasoning models and absent otherwise; show
// it before the reply when the model exposed its reasoning trace.
const message = result.choices[0].message;
if (message.reasoning_content) {
  console.log("[reasoning]", message.reasoning_content);
}
console.log(message.content);

// Streaming: set stream: true to receive an AsyncIterable of chunks. Each
// chunk's delta.content is a reply fragment and delta.reasoning_content is a
// reasoning fragment; concatenate each across chunks to reconstruct the full
// trace and reply.
const stream = llama.v1.chat.completions({
  messages: [...messages],
  max_tokens: 16,
  stream: true,
});
const encoder = new TextEncoder();
let inReasoning = false;
for await (const chunk of stream) {
  const delta = chunk.choices[0].delta;
  if (delta.reasoning_content) {
    if (!inReasoning) {
      await Deno.stdout.write(encoder.encode("[reasoning] "));
      inReasoning = true;
    }
    await Deno.stdout.write(encoder.encode(delta.reasoning_content));
  }
  if (delta.content) {
    if (inReasoning) {
      await Deno.stdout.write(encoder.encode("\n"));
      inReasoning = false;
    }
    await Deno.stdout.write(encoder.encode(delta.content));
  }
}
console.log();
