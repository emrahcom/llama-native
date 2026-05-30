// Integration test for /tokenize. Requires a running llama-server on the
// default local address. Run with:
// deno test --allow-net integration/tokenize.test.ts
import { assert, assertEquals } from "@std/assert";
import { Llama, type TokenizeResponse } from "@emrahcom/llama-native";

Deno.test("tokenize returns a TokenizeResponse from a running server", async () => {
  const llama = new Llama();
  const response: TokenizeResponse = await llama.tokenize({
    content: "Hello, world!",
  });
  assert(Array.isArray(response.tokens));
  for (const token of response.tokens) {
    assertEquals(typeof token, "number");
  }
});
