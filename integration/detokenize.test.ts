// Integration test for /detokenize. Requires a running llama-server on the
// default local address. Run with:
// deno test --allow-net integration/detokenize.test.ts
import { assertEquals } from "@std/assert";
import { type DetokenizeResponse, Llama } from "@emrahcom/llama-native";

Deno.test("detokenize returns a DetokenizeResponse from a running server", async () => {
  const llama = new Llama();
  const response: DetokenizeResponse = await llama.detokenize({
    tokens: [1, 2, 3],
  });
  assertEquals(typeof response.content, "string");
});

Deno.test("detokenize round-trips tokens produced by tokenize", async () => {
  const llama = new Llama();
  const { tokens } = await llama.tokenize({ content: "Hello, world!" });
  const response: DetokenizeResponse = await llama.detokenize({ tokens });
  assertEquals(typeof response.content, "string");
});
