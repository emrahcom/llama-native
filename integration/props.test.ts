// Integration test for /props. Requires a running llama-server on the default
// local address. Run with: deno test --allow-net integration/props.test.ts
import { assertEquals } from "@std/assert";
import { Llama, type PropsResponse } from "@emrahcom/llama-native";

Deno.test("props returns a PropsResponse from a running server", async () => {
  const llama = new Llama();
  const response: PropsResponse = await llama.props();
  assertEquals(typeof response.media_marker, "string");
});
