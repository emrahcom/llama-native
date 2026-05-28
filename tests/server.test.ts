import { assertEquals, assertStrictEquals } from "@std/assert";
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

Deno.test("health forwards the signal option to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(new Response(JSON.stringify({ status: "ok" })));
  });
  try {
    const llama = new Llama();
    const controller = new AbortController();
    await llama.server.health({ signal: controller.signal });
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

Deno.test("tokenize issues POST /tokenize against the configured baseUrl", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    return Promise.resolve(new Response(JSON.stringify({ tokens: [] })));
  });
  try {
    const llama = new Llama({ baseUrl: "http://example.com:9000" });
    await llama.server.tokenize({ content: "hello" });
    assertEquals(seenUrl, "http://example.com:9000/tokenize");
    assertEquals(seenMethod, "POST");
  } finally {
    restoreFetch();
  }
});

Deno.test("tokenize sends the TokenizeRequest as the JSON body, preserving add_special", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(new Response(JSON.stringify({ tokens: [] })));
  });
  try {
    const llama = new Llama();
    await llama.server.tokenize({ content: "hello", add_special: true });
    assertEquals(
      seenBody,
      JSON.stringify({ content: "hello", add_special: true }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("tokenize omits add_special from the body when not provided", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(new Response(JSON.stringify({ tokens: [] })));
  });
  try {
    const llama = new Llama();
    await llama.server.tokenize({ content: "hello" });
    assertEquals(seenBody, JSON.stringify({ content: "hello" }));
  } finally {
    restoreFetch();
  }
});

Deno.test("tokenize returns the parsed JSON body as TokenizeResponse on HTTP 200", async () => {
  stubFetch(() =>
    Promise.resolve(new Response(JSON.stringify({ tokens: [1, 2, 3] })))
  );
  try {
    const llama = new Llama();
    const result = await llama.server.tokenize({ content: "hello" });
    assertEquals(result, { tokens: [1, 2, 3] });
  } finally {
    restoreFetch();
  }
});

Deno.test("tokenize forwards the signal option to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(new Response(JSON.stringify({ tokens: [] })));
  });
  try {
    const llama = new Llama();
    const controller = new AbortController();
    await llama.server.tokenize({ content: "hello" }, {
      signal: controller.signal,
    });
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});
