// Generates a chat completion from a list of messages via
// POST /v1/chat/completions. The final section demonstrates tool calling, which
// requires the server started with --jinja and a model whose chat template
// supports tool use (see specs/endpoints/v1-chat-completions.md); the other
// sections run on a default launch.
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

// Non-streaming: await a single V1ChatCompletionsResponse.
const result = await llama.v1.chat.completions({
  messages: [...messages],
  max_tokens: 1024,
});
console.log(result.choices[0].message.content);

// Streaming: set stream: true to receive an AsyncIterable of chunks. Each
// chunk's delta.content is a fragment; concatenate them across chunks to
// reconstruct the full reply.
const stream = llama.v1.chat.completions({
  messages: [...messages],
  max_tokens: 1024,
  stream: true,
});
for await (const chunk of stream) {
  const content = chunk.choices[0].delta.content;
  if (content) {
    await Deno.stdout.write(new TextEncoder().encode(content));
  }
}
console.log();

// Tool calling: provide the functions the model may call. With tool_choice
// "required" the model must call one; it returns tool_calls instead of a direct
// answer. Run the function (stubbed here), then send its result back as a tool
// message to get the model's final reply. Requires --jinja (see the header).
const question = {
  role: "user",
  content: "What is the weather in Paris?",
} as const;

const toolReply = await llama.v1.chat.completions({
  messages: [question],
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
});

const assistantTurn = toolReply.choices[0].message;
const call = assistantTurn.tool_calls?.[0];
console.log(
  `model called ${call?.function.name} with ${call?.function.arguments}`,
);

const finalReply = await llama.v1.chat.completions({
  messages: [
    question,
    assistantTurn,
    {
      role: "tool",
      tool_call_id: call?.id ?? "",
      content: JSON.stringify({ temp_c: 18, condition: "sunny" }),
    },
  ],
});
console.log(finalReply.choices[0].message.content);
