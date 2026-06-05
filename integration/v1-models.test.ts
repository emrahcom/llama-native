// Integration test for /v1/models. Requires a running llama-server on the
// default local address. Run with:
// deno test --allow-net integration/v1-models.test.ts
import { assert, assertEquals } from "@std/assert";
import { Llama, type V1ModelsResponse } from "@emrahcom/llama-native";

Deno.test("v1.models returns a V1ModelsResponse from a running server", async () => {
  const llama = new Llama();
  const response: V1ModelsResponse = await llama.v1.models();
  assertEquals(response.object, "list");
  assert(Array.isArray(response.data));
  for (const model of response.data) {
    assertEquals(typeof model.id, "string");
    assertEquals(model.object, "model");
    assertEquals(typeof model.created, "number");
    assertEquals(typeof model.owned_by, "string");
  }
});
