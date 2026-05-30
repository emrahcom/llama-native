// Integration tests for /v1/completions, one per mode (non-streaming and
// streaming). Requires a running llama-server on the default local address.
// Run with: deno test --allow-net integration/v1-completions.test.ts
import { assert, assertEquals } from "@std/assert";
import {
  type CompletionsChunk,
  type CompletionsResponse,
  Llama,
} from "@emrahcom/llama-native";

Deno.test("v1.completions (non-streaming) returns a CompletionsResponse from a running server", async () => {
  const llama = new Llama();
  const response: CompletionsResponse = await llama.v1.completions({
    prompt: "The capital of France is",
    max_tokens: 16,
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
    assertEquals(choice.logprobs, null);
    assert(
      choice.finish_reason === "stop" || choice.finish_reason === "length",
    );
  }
  assertEquals(typeof response.usage.prompt_tokens, "number");
  assertEquals(typeof response.usage.completion_tokens, "number");
  assertEquals(typeof response.usage.total_tokens, "number");
});

Deno.test("v1.completions (streaming) yields CompletionsChunks from a running server", async () => {
  const llama = new Llama();
  const chunks: CompletionsChunk[] = [];
  for await (
    const chunk of llama.v1.completions({
      prompt: "The capital of France is",
      max_tokens: 16,
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
      assertEquals(choice.logprobs, null);
      assert(
        choice.finish_reason === null ||
          choice.finish_reason === "stop" ||
          choice.finish_reason === "length",
      );
    }
  }
});
