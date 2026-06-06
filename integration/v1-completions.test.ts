// Integration tests for /v1/completions, one per mode (non-streaming and
// streaming). Requires a running llama-server on the default local address.
// Run with: deno test --allow-net integration/v1-completions.test.ts
import { assert, assertEquals } from "@std/assert";
import {
  Llama,
  type V1CompletionsChunk,
  type V1CompletionsResponse,
} from "@emrahcom/llama-native";

Deno.test("v1.completions (non-streaming) returns a V1CompletionsResponse from a running server", async () => {
  const llama = new Llama();
  const response: V1CompletionsResponse = await llama.v1.completions({
    prompt: "The capital of France is",
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
  assertEquals(response.object, "text_completion");
  assertEquals(typeof response.created, "number");
  assertEquals(typeof response.model, "string");
  assert(Array.isArray(response.choices));
  assert(response.choices.length > 0);
  for (const choice of response.choices) {
    assertEquals(typeof choice.index, "number");
    assertEquals(typeof choice.text, "string");
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

Deno.test("v1.completions (streaming) yields CompletionsChunks from a running server", async () => {
  const llama = new Llama();
  const chunks: V1CompletionsChunk[] = [];
  for await (
    const chunk of llama.v1.completions({
      prompt: "The capital of France is",
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
    assertEquals(chunk.object, "text_completion");
    assertEquals(typeof chunk.created, "number");
    assertEquals(typeof chunk.model, "string");
    assert(Array.isArray(chunk.choices));
    for (const choice of chunk.choices) {
      assertEquals(typeof choice.index, "number");
      assertEquals(typeof choice.text, "string");
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
