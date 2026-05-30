// Integration test for /health. Requires a running llama-server on the default
// local address. Run with: deno test --allow-net integration/health.test.ts
import { assertEquals } from "@std/assert";
import { type HealthResponse, Llama } from "@emrahcom/llama-native";

Deno.test("health returns a HealthResponse from a running server", async () => {
  const llama = new Llama();
  const response: HealthResponse = await llama.health();
  assertEquals(typeof response.status, "string");
});
