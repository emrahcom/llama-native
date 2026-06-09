// Tool calling on POST /v1/chat/completions (non-streaming). The model returns
// tool_calls instead of a direct answer; run the function, then send its result
// back as a tool message to get the final reply.
//
// Requires the server started with --jinja and a model whose chat template
// supports tool use (see specs/endpoints/v1-chat-completions.md).
//
// Run against such a server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env examples/v1-chat-completions-tools.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/v1-chat-completions-tools.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

// With tool_choice "required" the model must call a tool. Run the function
// (stubbed here), then send its result back as a tool message to get the final
// reply.
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

// Reply with the tool's result (stubbed) to get the model's final answer.
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
