// Integration tests for /completion, one per mode (non-streaming and
// streaming), plus multimodal input. Requires a running llama-server on the
// default local address; the multimodal test additionally requires a
// multimodal model with its projector loaded (with `-hf` it loads
// automatically via `--mmproj-auto`, or pass `--mmproj FILE`) (see the server
// requirements in specs/endpoints/completion.md).
// Run with: deno test --allow-net integration/completion.test.ts
import { assert, assertEquals } from "@std/assert";
import {
  type CompletionChunk,
  type CompletionResponse,
  Llama,
  type Timings,
} from "@emrahcom/llama-native";

function assertTimings(timings: Timings): void {
  assertEquals(typeof timings.prompt_n, "number");
  assertEquals(typeof timings.prompt_ms, "number");
  assertEquals(typeof timings.prompt_per_token_ms, "number");
  assertEquals(typeof timings.prompt_per_second, "number");
  assertEquals(typeof timings.predicted_n, "number");
  assertEquals(typeof timings.predicted_ms, "number");
  assertEquals(typeof timings.predicted_per_token_ms, "number");
  assertEquals(typeof timings.predicted_per_second, "number");
}

function isStopType(value: string): boolean {
  return value === "none" || value === "eos" || value === "word" ||
    value === "limit";
}

Deno.test("completion (non-streaming) returns a CompletionResponse from a running server", async () => {
  const llama = new Llama();
  const response: CompletionResponse = await llama.completion({
    prompt: "The capital of France is",
    n_predict: 1024,
    top_k: 40,
    top_p: 0.95,
    min_p: 0.05,
    presence_penalty: 0.1,
    frequency_penalty: 0.1,
    repeat_penalty: 1.1,
    seed: 42,
  });
  assertEquals(typeof response.content, "string");
  assertEquals(response.stop, true);
  assertEquals(typeof response.model, "string");
  assert(isStopType(response.stop_type));
  assertEquals(typeof response.stopping_word, "string");
  assertEquals(typeof response.tokens_predicted, "number");
  assertEquals(typeof response.tokens_evaluated, "number");
  assertEquals(typeof response.tokens_cached, "number");
  assertEquals(typeof response.truncated, "boolean");
  assertTimings(response.timings);
});

Deno.test("completion (streaming) yields CompletionChunks from a running server", async () => {
  const llama = new Llama();
  const chunks: CompletionChunk[] = [];
  for await (
    const chunk of llama.completion({
      prompt: "The capital of France is",
      n_predict: 1024,
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
    assertEquals(typeof chunk.content, "string");
    assertEquals(typeof chunk.stop, "boolean");
    if (chunk.stop_type !== undefined) assert(isStopType(chunk.stop_type));
    if (chunk.stopping_word !== undefined) {
      assertEquals(typeof chunk.stopping_word, "string");
    }
    if (chunk.tokens_predicted !== undefined) {
      assertEquals(typeof chunk.tokens_predicted, "number");
    }
    if (chunk.tokens_evaluated !== undefined) {
      assertEquals(typeof chunk.tokens_evaluated, "number");
    }
    if (chunk.tokens_cached !== undefined) {
      assertEquals(typeof chunk.tokens_cached, "number");
    }
    if (chunk.truncated !== undefined) {
      assertEquals(typeof chunk.truncated, "boolean");
    }
    if (chunk.timings !== undefined) assertTimings(chunk.timings);
  }
  // Native streams end after a stop: true chunk; no [DONE] sentinel.
  assertEquals(chunks[chunks.length - 1].stop, true);
});

Deno.test("completion (multimodal) accepts an image in the prompt", async () => {
  const llama = new Llama();
  // The server's media marker, placed once in prompt_string per media item.
  const { media_marker } = await llama.props();
  // A real, decodable image (the llama.cpp project logo), base64-encoded.
  const imageUrl =
    "https://raw.githubusercontent.com/ggml-org/llama.cpp/master/media/llama0-logo.png";
  const bytes = new Uint8Array(await (await fetch(imageUrl)).arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 = btoa(binary);
  const response: CompletionResponse = await llama.completion({
    prompt: {
      prompt_string: `Describe this image in one word: ${media_marker}`,
      multimodal_data: [base64],
    },
    n_predict: 64,
    seed: 42,
  });
  assertEquals(typeof response.content, "string");
  assertEquals(response.stop, true);
  assertTimings(response.timings);
});
