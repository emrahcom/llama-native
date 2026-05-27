import { assertEquals, assertRejects, assertStrictEquals } from "@std/assert";
import { Llama } from "@emrahcom/llama-native";

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

Deno.test("health throws on a non-2xx status", async () => {
  stubFetch(() => Promise.resolve(new Response("nope", { status: 503 })));
  try {
    const llama = new Llama();
    await assertRejects(() => llama.server.health(), Error);
  } finally {
    restoreFetch();
  }
});

Deno.test("health propagates network errors", async () => {
  stubFetch(() => Promise.reject(new TypeError("network down")));
  try {
    const llama = new Llama();
    await assertRejects(() => llama.server.health(), TypeError, "network down");
  } finally {
    restoreFetch();
  }
});

Deno.test("health throws on a JSON parse error", async () => {
  stubFetch(() => Promise.resolve(new Response("not json")));
  try {
    const llama = new Llama();
    await assertRejects(() => llama.server.health());
  } finally {
    restoreFetch();
  }
});
