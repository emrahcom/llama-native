// Integration tests for /embedding, plus multimodal input. Requires a running
// llama-server on the default local address, started with `--embedding`; the
// multimodal test additionally requires a multimodal model with its projector
// loaded (with `-hf` it loads automatically via `--mmproj-auto`, or pass
// `--mmproj FILE`). See the server requirements in
// specs/endpoints/embedding.md. Both pooled and `--pooling none` launches are
// accepted, so `embedding` is asserted only as a non-empty array of float
// arrays.
// Run with: deno test --allow-net integration/embedding.test.ts
import { assert, assertEquals } from "@std/assert";
import { type EmbeddingResponse, Llama } from "@emrahcom/llama-native";

Deno.test("embedding returns an EmbeddingResponse for a single input from a running server", async () => {
  const llama = new Llama();
  const response: EmbeddingResponse = await llama.embedding({
    content: "The capital of France is Paris.",
  });
  assert(Array.isArray(response));
  assertEquals(response.length, 1);
  const [entry] = response;
  assertEquals(entry.index, 0);
  assert(Array.isArray(entry.embedding));
  assert(entry.embedding.length > 0);
  for (const vector of entry.embedding) {
    assert(Array.isArray(vector));
    assert(vector.length > 0);
    for (const value of vector) {
      assertEquals(typeof value, "number");
    }
  }
});

Deno.test("embedding returns one indexed entry per input for a batch from a running server", async () => {
  const llama = new Llama();
  const response: EmbeddingResponse = await llama.embedding({
    content: ["The first sentence.", "The second sentence."],
  });
  assert(Array.isArray(response));
  assertEquals(response.length, 2);
  response.forEach((entry, i) => {
    assertEquals(entry.index, i);
    assert(Array.isArray(entry.embedding));
    assert(entry.embedding.length > 0);
    for (const vector of entry.embedding) {
      assert(Array.isArray(vector));
      assert(vector.length > 0);
    }
  });
});

Deno.test("embedding returns an EmbeddingResponse for multimodal content from a running server", async () => {
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
  const response: EmbeddingResponse = await llama.embedding({
    content: {
      prompt_string: `Embed this image: ${media_marker}`,
      multimodal_data: [base64],
    },
  });
  assert(Array.isArray(response));
  assertEquals(response.length, 1);
  const [entry] = response;
  assertEquals(entry.index, 0);
  assert(Array.isArray(entry.embedding));
  assert(entry.embedding.length > 0);
  for (const vector of entry.embedding) {
    assert(Array.isArray(vector));
    assert(vector.length > 0);
    for (const value of vector) {
      assertEquals(typeof value, "number");
    }
  }
});
