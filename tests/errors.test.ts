import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import {
  LlamaError,
  LlamaHTTPError,
  LlamaStreamError,
} from "@emrahcom/llama-native";

Deno.test("LlamaError is an Error and a LlamaError", () => {
  const error = new LlamaError("boom");
  assert(error instanceof Error);
  assert(error instanceof LlamaError);
});

Deno.test("LlamaError forwards the message", () => {
  const error = new LlamaError("boom");
  assertEquals(error.message, "boom");
});

Deno.test("LlamaError sets its name to LlamaError", () => {
  const error = new LlamaError("boom");
  assertEquals(error.name, "LlamaError");
});

Deno.test("LlamaError preserves the cause from options", () => {
  const cause = new TypeError("network down");
  const error = new LlamaError("boom", { cause });
  assertStrictEquals(error.cause, cause);
});

Deno.test("LlamaHTTPError extends LlamaError and Error", () => {
  const error = new LlamaHTTPError("HTTP 503 from GET /health", 503);
  assert(error instanceof Error);
  assert(error instanceof LlamaError);
  assert(error instanceof LlamaHTTPError);
});

Deno.test("LlamaHTTPError forwards the message", () => {
  const error = new LlamaHTTPError("HTTP 404 from GET /health", 404);
  assertEquals(error.message, "HTTP 404 from GET /health");
});

Deno.test("LlamaHTTPError sets its name to LlamaHTTPError", () => {
  const error = new LlamaHTTPError("HTTP 500 from GET /health", 500);
  assertEquals(error.name, "LlamaHTTPError");
});

Deno.test("LlamaHTTPError exposes the status", () => {
  const error = new LlamaHTTPError("HTTP 404 from GET /health", 404);
  assertEquals(error.status, 404);
});

Deno.test("LlamaHTTPError exposes the parsed body", () => {
  const body = { error: { code: 404, message: "not found", type: "x" } };
  const error = new LlamaHTTPError("HTTP 404 from GET /health", 404, body);
  assertStrictEquals(error.body, body);
});

Deno.test("LlamaHTTPError leaves body undefined when omitted", () => {
  const error = new LlamaHTTPError("HTTP 500 from GET /health", 500);
  assertStrictEquals(error.body, undefined);
});

Deno.test("LlamaHTTPError preserves the cause from options", () => {
  const cause = new SyntaxError("bad json");
  const error = new LlamaHTTPError(
    "HTTP 200 from GET /health",
    200,
    undefined,
    { cause },
  );
  assertStrictEquals(error.cause, cause);
});

Deno.test("LlamaStreamError extends LlamaError and Error", () => {
  const error = new LlamaStreamError("Stream ended without [DONE] marker");
  assert(error instanceof Error);
  assert(error instanceof LlamaError);
  assert(error instanceof LlamaStreamError);
});

Deno.test("LlamaStreamError forwards the message", () => {
  const error = new LlamaStreamError("Failed to parse stream chunk");
  assertEquals(error.message, "Failed to parse stream chunk");
});

Deno.test("LlamaStreamError sets its name to LlamaStreamError", () => {
  const error = new LlamaStreamError("Stream ended without [DONE] marker");
  assertEquals(error.name, "LlamaStreamError");
});

Deno.test("LlamaStreamError preserves the cause from options", () => {
  const cause = new SyntaxError("bad json");
  const error = new LlamaStreamError("Failed to parse stream chunk", { cause });
  assertStrictEquals(error.cause, cause);
});
