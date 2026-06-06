// Integration tests for /v1/embeddings. Requires a running llama-server on the
// default local address, started with embedding support (e.g. --embeddings).
// Run with: deno test --allow-net integration/v1-embeddings.test.ts
import { assert, assertEquals } from "@std/assert";
import { Llama, type V1EmbeddingsResponse } from "@emrahcom/llama-native";

Deno.test("v1.embeddings returns a V1EmbeddingsResponse for a single input from a running server", async () => {
  const llama = new Llama();
  const response: V1EmbeddingsResponse = await llama.v1.embeddings({
    input: "The capital of France is Paris.",
  });
  assertEquals(response.object, "list");
  assertEquals(typeof response.model, "string");
  assert(Array.isArray(response.data));
  assertEquals(response.data.length, 1);
  const [embedding] = response.data;
  assertEquals(embedding.object, "embedding");
  assertEquals(embedding.index, 0);
  assert(Array.isArray(embedding.embedding));
  assert(embedding.embedding.length > 0);
  for (const value of embedding.embedding) {
    assertEquals(typeof value, "number");
  }
  assertEquals(typeof response.usage.prompt_tokens, "number");
  assertEquals(typeof response.usage.total_tokens, "number");
});

Deno.test("v1.embeddings returns one indexed embedding per input for a batch from a running server", async () => {
  const llama = new Llama();
  const response: V1EmbeddingsResponse = await llama.v1.embeddings({
    input: ["The first sentence.", "The second sentence."],
  });
  assertEquals(response.object, "list");
  assertEquals(response.data.length, 2);
  response.data.forEach((embedding, i) => {
    assertEquals(embedding.object, "embedding");
    assertEquals(embedding.index, i);
    assert(Array.isArray(embedding.embedding));
    assert(embedding.embedding.length > 0);
  });
  assertEquals(typeof response.usage.prompt_tokens, "number");
  assertEquals(typeof response.usage.total_tokens, "number");
});
