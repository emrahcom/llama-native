// Streaming tool calls on POST /v1/chat/completions. With stream: true the tool
// call arrives as fragments across chunks; reassemble each per its tool_calls
// index.
//
// Requires the server started with --jinja and a model whose chat template
// supports tool use (see specs/endpoints/v1-chat-completions.md).
//
// Run against such a server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env \
//     examples/v1-chat-completions-streaming-tools.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env \
//     examples/v1-chat-completions-streaming-tools.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

// Reassemble each call per its tool_calls index: take id and function.name from
// the first fragment that provides them, and concatenate the function.arguments
// fragments in order. With tool_choice "required" the model must call a tool.
const toolStream = llama.v1.chat.completions({
  messages: [{ role: "user", content: "What is the weather in Paris?" }],
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get the current weather for a city.",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
      },
    },
  ],
  tool_choice: "required",
  stream: true,
});

const streamedCalls: { id: string; name: string; arguments: string }[] = [];
for await (const chunk of toolStream) {
  for (const fragment of chunk.choices[0].delta.tool_calls ?? []) {
    const c = (streamedCalls[fragment.index] ??= {
      id: "",
      name: "",
      arguments: "",
    });
    if (fragment.id) c.id = fragment.id;
    if (fragment.function?.name) c.name = fragment.function.name;
    if (fragment.function?.arguments) {
      c.arguments += fragment.function.arguments;
    }
  }
}
for (const c of streamedCalls) {
  console.log(`model called ${c.name} with ${c.arguments}`);
}
