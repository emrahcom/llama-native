import { assertEquals, assertStrictEquals, assertThrows } from "@std/assert";
import { Llama } from "@emrahcom/llama-native";

Deno.test("baseUrl defaults to llama-server's default when no options", () => {
  const llama = new Llama();
  assertEquals(llama.config.baseUrl, "http://localhost:8080");
});

Deno.test("baseUrl defaults when options is empty", () => {
  const llama = new Llama({});
  assertEquals(llama.config.baseUrl, "http://localhost:8080");
});

Deno.test("baseUrl defaults when undefined", () => {
  const llama = new Llama({ baseUrl: undefined });
  assertEquals(llama.config.baseUrl, "http://localhost:8080");
});

Deno.test("baseUrl defaults when falsy (empty string)", () => {
  const llama = new Llama({ baseUrl: "" });
  assertEquals(llama.config.baseUrl, "http://localhost:8080");
});

Deno.test("baseUrl is used as given when no trailing slash", () => {
  const llama = new Llama({ baseUrl: "http://example.com:9000" });
  assertEquals(llama.config.baseUrl, "http://example.com:9000");
});

Deno.test("baseUrl strips a single trailing slash", () => {
  const llama = new Llama({ baseUrl: "http://example.com:9000/" });
  assertEquals(llama.config.baseUrl, "http://example.com:9000");
});

Deno.test("baseUrl strips multiple trailing slashes", () => {
  const llama = new Llama({ baseUrl: "http://example.com:9000///" });
  assertEquals(llama.config.baseUrl, "http://example.com:9000");
});

Deno.test("apiKey is undefined when not provided", () => {
  const llama = new Llama();
  assertStrictEquals(llama.config.apiKey, undefined);
});

Deno.test("apiKey is kept when provided", () => {
  const llama = new Llama({ apiKey: "secret" });
  assertEquals(llama.config.apiKey, "secret");
});

Deno.test("config is frozen after construction", () => {
  const llama = new Llama();
  assertEquals(Object.isFrozen(llama.config), true);
  assertThrows(() => {
    // deno-lint-ignore no-explicit-any
    (llama.config as any).baseUrl = "http://other:8080";
  }, TypeError);
});
