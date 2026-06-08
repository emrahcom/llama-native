// Integration tests for /v1/chat/completions, one per mode (non-streaming and
// streaming), plus tool calling. Requires a running llama-server on the default
// local address; the tool-calling test additionally requires the server to be
// started with `--jinja` and a model whose chat template supports tool use (see
// the server requirements in specs/endpoints/v1-chat-completions.md).
// Run with: deno test --allow-net integration/v1-chat-completions.test.ts
import { assert, assertEquals } from "@std/assert";
import {
  Llama,
  type V1ChatCompletionsChunk,
  type V1ChatCompletionsResponse,
} from "@emrahcom/llama-native";

Deno.test("v1.chat.completions (non-streaming) returns a V1ChatCompletionsResponse from a running server", async () => {
  const llama = new Llama();
  const response: V1ChatCompletionsResponse = await llama.v1.chat.completions({
    messages: [{ role: "user", content: "The capital of France is" }],
    max_tokens: 1024,
    top_k: 40,
    top_p: 0.95,
    min_p: 0.05,
    presence_penalty: 0.1,
    frequency_penalty: 0.1,
    repeat_penalty: 1.1,
    seed: 42,
  });
  assertEquals(typeof response.id, "string");
  assertEquals(response.object, "chat.completion");
  assertEquals(typeof response.created, "number");
  assertEquals(typeof response.model, "string");
  assert(Array.isArray(response.choices));
  assert(response.choices.length > 0);
  for (const choice of response.choices) {
    assertEquals(typeof choice.index, "number");
    assertEquals(choice.message.role, "assistant");
    assertEquals(typeof choice.message.content, "string");
    assert(
      choice.finish_reason === "stop" || choice.finish_reason === "length",
    );
  }
  assertEquals(typeof response.usage.prompt_tokens, "number");
  assertEquals(typeof response.usage.completion_tokens, "number");
  assertEquals(typeof response.usage.total_tokens, "number");
  if (response.usage.prompt_tokens_details !== undefined) {
    assertEquals(
      typeof response.usage.prompt_tokens_details.cached_tokens,
      "number",
    );
  }
});

Deno.test("v1.chat.completions (non-streaming) returns tool calls when a tool is required", async () => {
  const llama = new Llama();
  const response: V1ChatCompletionsResponse = await llama.v1.chat.completions({
    messages: [{ role: "user", content: "What is the weather in Paris?" }],
    tools: [{
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
    }],
    tool_choice: "required",
    seed: 42,
  });
  assert(response.choices.length > 0);
  const choice = response.choices[0];
  assertEquals(choice.finish_reason, "tool_calls");
  assertEquals(choice.message.role, "assistant");
  const toolCalls = choice.message.tool_calls;
  assert(Array.isArray(toolCalls) && toolCalls.length > 0);
  for (const call of toolCalls) {
    assertEquals(typeof call.id, "string");
    assertEquals(call.type, "function");
    assertEquals(typeof call.function.name, "string");
    assertEquals(typeof call.function.arguments, "string");
  }
});

Deno.test("v1.chat.completions (streaming) yields ChatCompletionsChunks from a running server", async () => {
  const llama = new Llama();
  const chunks: V1ChatCompletionsChunk[] = [];
  for await (
    const chunk of llama.v1.chat.completions({
      messages: [{ role: "user", content: "The capital of France is" }],
      max_tokens: 1024,
      top_k: 40,
      top_p: 0.95,
      min_p: 0.05,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
      repeat_penalty: 1.1,
      seed: 42,
      stream: true,
    })
  ) {
    chunks.push(chunk);
  }
  assert(chunks.length > 0);
  for (const chunk of chunks) {
    assertEquals(typeof chunk.id, "string");
    assertEquals(chunk.object, "chat.completion.chunk");
    assertEquals(typeof chunk.created, "number");
    assertEquals(typeof chunk.model, "string");
    assert(Array.isArray(chunk.choices));
    for (const choice of chunk.choices) {
      assertEquals(typeof choice.index, "number");
      if (choice.delta.role !== undefined) {
        assertEquals(choice.delta.role, "assistant");
      }
      if (choice.delta.content != null) {
        assertEquals(typeof choice.delta.content, "string");
      }
      assert(
        choice.finish_reason === null ||
          choice.finish_reason === "stop" ||
          choice.finish_reason === "length",
      );
    }
    if (chunk.usage?.prompt_tokens_details !== undefined) {
      assertEquals(
        typeof chunk.usage.prompt_tokens_details.cached_tokens,
        "number",
      );
    }
  }
});

Deno.test("v1.chat.completions (streaming) yields tool-call deltas when a tool is required", async () => {
  const llama = new Llama();
  const chunks: V1ChatCompletionsChunk[] = [];
  for await (
    const chunk of llama.v1.chat.completions({
      messages: [{ role: "user", content: "What is the weather in Paris?" }],
      tools: [{
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
      }],
      tool_choice: "required",
      seed: 42,
      stream: true,
    })
  ) {
    chunks.push(chunk);
  }
  assert(chunks.length > 0);
  let sawToolCallFragment = false;
  let finishReason: string | null = null;
  for (const chunk of chunks) {
    for (const choice of chunk.choices) {
      for (const fragment of choice.delta.tool_calls ?? []) {
        assertEquals(typeof fragment.index, "number");
        if (fragment.id !== undefined) {
          assertEquals(typeof fragment.id, "string");
        }
        if (fragment.type !== undefined) {
          assertEquals(fragment.type, "function");
        }
        if (fragment.function?.name !== undefined) {
          assertEquals(typeof fragment.function.name, "string");
        }
        if (fragment.function?.arguments !== undefined) {
          assertEquals(typeof fragment.function.arguments, "string");
        }
        sawToolCallFragment = true;
      }
      if (choice.finish_reason !== null) {
        finishReason = choice.finish_reason;
      }
    }
  }
  assert(sawToolCallFragment);
  assertEquals(finishReason, "tool_calls");
});
