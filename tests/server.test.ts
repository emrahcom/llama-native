import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { Llama, LlamaError, LlamaHTTPError } from "@emrahcom/llama-native";

const originalFetch = globalThis.fetch;

type FetchHandler = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function stubFetch(handler: FetchHandler): void {
  globalThis.fetch = handler as typeof globalThis.fetch;
}

function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

Deno.test("health issues GET /health against the configured baseUrl", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    return Promise.resolve(new Response(JSON.stringify({ status: "ok" })));
  });
  try {
    const llama = new Llama({ baseUrl: "http://example.com:9000" });
    await llama.server.health();
    assertEquals(seenUrl, "http://example.com:9000/health");
    assertEquals(seenMethod, "GET");
  } finally {
    restoreFetch();
  }
});

Deno.test("health returns the parsed JSON body on HTTP 200", async () => {
  stubFetch(() =>
    Promise.resolve(new Response(JSON.stringify({ status: "ok" })))
  );
  try {
    const llama = new Llama();
    const result = await llama.server.health();
    assertEquals(result, { status: "ok" });
  } finally {
    restoreFetch();
  }
});

Deno.test("health returns non-ok status strings unchanged", async () => {
  stubFetch(() =>
    Promise.resolve(new Response(JSON.stringify({ status: "loading model" })))
  );
  try {
    const llama = new Llama();
    const result = await llama.server.health();
    assertEquals(result.status, "loading model");
  } finally {
    restoreFetch();
  }
});

Deno.test("health omits Authorization header when no apiKey", async () => {
  let auth: string | null = null;
  stubFetch((_input, init) => {
    auth = new Headers(init?.headers).get("Authorization");
    return Promise.resolve(new Response(JSON.stringify({ status: "ok" })));
  });
  try {
    const llama = new Llama();
    await llama.server.health();
    assertStrictEquals(auth, null);
  } finally {
    restoreFetch();
  }
});

Deno.test("health adds Authorization: Bearer <key> when apiKey is set", async () => {
  let auth: string | null = null;
  stubFetch((_input, init) => {
    auth = new Headers(init?.headers).get("Authorization");
    return Promise.resolve(new Response(JSON.stringify({ status: "ok" })));
  });
  try {
    const llama = new Llama({ apiKey: "secret" });
    await llama.server.health();
    assertEquals(auth, "Bearer secret");
  } finally {
    restoreFetch();
  }
});

Deno.test("health throws LlamaHTTPError on a non-2xx status", async () => {
  stubFetch(() => Promise.resolve(new Response("nope", { status: 503 })));
  try {
    const llama = new Llama();
    const error = await assertRejects(
      () => llama.server.health(),
      LlamaHTTPError,
      "HTTP 503 from GET /health",
    );
    assertEquals(error.status, 503);
    assertEquals(error.body, "nope");
  } finally {
    restoreFetch();
  }
});

Deno.test("health exposes a JSON error body on LlamaHTTPError", async () => {
  const errorBody = { error: { code: 503, message: "loading", type: "x" } };
  stubFetch(() =>
    Promise.resolve(new Response(JSON.stringify(errorBody), { status: 503 }))
  );
  try {
    const llama = new Llama();
    const error = await assertRejects(
      () => llama.server.health(),
      LlamaHTTPError,
    );
    assertEquals(error.body, errorBody);
  } finally {
    restoreFetch();
  }
});

Deno.test("health wraps network errors in LlamaError with cause", async () => {
  const cause = new TypeError("network down");
  stubFetch(() => Promise.reject(cause));
  try {
    const llama = new Llama();
    const error = await assertRejects(
      () => llama.server.health(),
      LlamaError,
      "GET /health request failed",
    );
    assertStrictEquals(error.cause, cause);
  } finally {
    restoreFetch();
  }
});

Deno.test("health propagates AbortError unchanged", async () => {
  const abort = new DOMException("aborted", "AbortError");
  stubFetch(() => Promise.reject(abort));
  try {
    const llama = new Llama();
    const error = await assertRejects(() => llama.server.health());
    assertStrictEquals(error, abort);
  } finally {
    restoreFetch();
  }
});

Deno.test("health throws LlamaError on a JSON parse error", async () => {
  stubFetch(() => Promise.resolve(new Response("not json")));
  try {
    const llama = new Llama();
    const error = await assertRejects(
      () => llama.server.health(),
      LlamaError,
      "Failed to parse GET /health response body",
    );
    assertInstanceOf(error, LlamaError);
  } finally {
    restoreFetch();
  }
});
