import { assertEquals } from "@std/assert";
import { Client } from "../src/mod.ts";

Deno.test("Client - baseUrl construction", () => {
  // Test with trailing slash and custom port
  const client1 = new Client({ host: "http://127.0.0.1/", port: 1234 });
  assertEquals(client1.config.baseUrl, "http://127.0.0.1:1234");

  // Test with defaults
  const client2 = new Client();
  assertEquals(client2.config.baseUrl, "http://localhost:8080");
});
