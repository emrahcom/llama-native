import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { LlamaError, LlamaHTTPError } from "@emrahcom/llama-native";
import { request } from "../src/request/mod.ts";
import type { Config } from "../src/types/config.ts";

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

const config: Config = { baseUrl: "http://example.com:9000" };
const configWithKey: Config = {
  baseUrl: "http://example.com:9000",
  apiKey: "secret",
};

Deno.test("request sends the given method to `${baseUrl}${path}`", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  });
  try {
    await request({ config, method: "GET", path: "/health" });
    assertEquals(seenUrl, "http://example.com:9000/health");
    assertEquals(seenMethod, "GET");
  } finally {
    restoreFetch();
  }
});

Deno.test("request prepends a `/` when path does not start with one", async () => {
  let seenUrl: string | undefined;
  stubFetch((input) => {
    seenUrl = input.toString();
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  });
  try {
    await request({ config, method: "GET", path: "health" });
    assertEquals(seenUrl, "http://example.com:9000/health");
  } finally {
    restoreFetch();
  }
});

Deno.test("request leaves path unchanged when it already starts with `/`", async () => {
  let seenUrl: string | undefined;
  stubFetch((input) => {
    seenUrl = input.toString();
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  });
  try {
    await request({ config, method: "GET", path: "/v1/models" });
    assertEquals(seenUrl, "http://example.com:9000/v1/models");
  } finally {
    restoreFetch();
  }
});

Deno.test("request omits Authorization header when no apiKey", async () => {
  let auth: string | null = null;
  stubFetch((_input, init) => {
    auth = new Headers(init?.headers).get("Authorization");
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  });
  try {
    await request({ config, method: "GET", path: "/health" });
    assertStrictEquals(auth, null);
  } finally {
    restoreFetch();
  }
});

Deno.test("request adds Authorization: Bearer <key> when apiKey is set", async () => {
  let auth: string | null = null;
  stubFetch((_input, init) => {
    auth = new Headers(init?.headers).get("Authorization");
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  });
  try {
    await request({ config: configWithKey, method: "GET", path: "/health" });
    assertEquals(auth, "Bearer secret");
  } finally {
    restoreFetch();
  }
});

Deno.test("request serializes the body and sets Content-Type when body is given", async () => {
  let contentType: string | null = null;
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    contentType = new Headers(init?.headers).get("Content-Type");
    seenBody = init?.body as string | undefined;
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  });
  try {
    const body = { prompt: "hello", n: 2 };
    await request({ config, method: "POST", path: "/completion", body });
    assertEquals(contentType, "application/json");
    assertEquals(seenBody, JSON.stringify(body));
  } finally {
    restoreFetch();
  }
});

Deno.test("request omits Content-Type and body when body is not given", async () => {
  let contentType: string | null = null;
  let seenBody: BodyInit | null | undefined;
  stubFetch((_input, init) => {
    contentType = new Headers(init?.headers).get("Content-Type");
    seenBody = init?.body;
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  });
  try {
    await request({ config, method: "GET", path: "/health" });
    assertStrictEquals(contentType, null);
    assertStrictEquals(seenBody, undefined);
  } finally {
    restoreFetch();
  }
});

Deno.test("request forwards signal to fetch when provided", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(new Response(JSON.stringify({ ok: true })));
  });
  try {
    const controller = new AbortController();
    await request({
      config,
      method: "GET",
      path: "/health",
      signal: controller.signal,
    });
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

Deno.test("request returns the parsed JSON body on success", async () => {
  stubFetch(() =>
    Promise.resolve(new Response(JSON.stringify({ status: "ok", n: 1 })))
  );
  try {
    const result = await request({ config, method: "GET", path: "/health" });
    assertEquals(result, { status: "ok", n: 1 });
  } finally {
    restoreFetch();
  }
});

Deno.test("request propagates AbortError unchanged", async () => {
  const abort = new DOMException("aborted", "AbortError");
  stubFetch(() => Promise.reject(abort));
  try {
    const error = await assertRejects(() =>
      request({ config, method: "GET", path: "/health" })
    );
    assertStrictEquals(error, abort);
  } finally {
    restoreFetch();
  }
});

Deno.test("request wraps non-AbortError fetch rejections in LlamaError with cause", async () => {
  const cause = new TypeError("network down");
  stubFetch(() => Promise.reject(cause));
  try {
    const error = await assertRejects(
      () => request({ config, method: "POST", path: "/completion" }),
      LlamaError,
      "POST /completion request failed",
    );
    assertStrictEquals(error.cause, cause);
  } finally {
    restoreFetch();
  }
});

Deno.test("request throws LlamaHTTPError on a non-2xx response", async () => {
  stubFetch(() => Promise.resolve(new Response("nope", { status: 503 })));
  try {
    const error = await assertRejects(
      () => request({ config, method: "GET", path: "/health" }),
      LlamaHTTPError,
      "HTTP 503 from GET /health",
    );
    assertEquals(error.status, 503);
  } finally {
    restoreFetch();
  }
});

Deno.test("request exposes a JSON-parseable error body as the parsed value", async () => {
  const errorBody = { error: { code: 503, message: "loading", type: "x" } };
  stubFetch(() =>
    Promise.resolve(new Response(JSON.stringify(errorBody), { status: 503 }))
  );
  try {
    const error = await assertRejects(
      () => request({ config, method: "GET", path: "/health" }),
      LlamaHTTPError,
    );
    assertEquals(error.body, errorBody);
  } finally {
    restoreFetch();
  }
});

Deno.test("request exposes a non-JSON error body as the raw text", async () => {
  stubFetch(() =>
    Promise.resolve(new Response("service unavailable", { status: 503 }))
  );
  try {
    const error = await assertRejects(
      () => request({ config, method: "GET", path: "/health" }),
      LlamaHTTPError,
    );
    assertEquals(error.body, "service unavailable");
  } finally {
    restoreFetch();
  }
});

Deno.test("request leaves body undefined when the error body cannot be read", async () => {
  const unreadable = new ReadableStream({
    start(controller) {
      controller.error(new Error("read failed"));
    },
  });
  stubFetch(() => Promise.resolve(new Response(unreadable, { status: 503 })));
  try {
    const error = await assertRejects(
      () => request({ config, method: "GET", path: "/health" }),
      LlamaHTTPError,
    );
    assertStrictEquals(error.body, undefined);
  } finally {
    restoreFetch();
  }
});

Deno.test("request throws LlamaError when a success response body fails to parse as JSON", async () => {
  stubFetch(() => Promise.resolve(new Response("not json")));
  try {
    const error = await assertRejects(
      () => request({ config, method: "GET", path: "/health" }),
      LlamaError,
      "Failed to parse GET /health response body",
    );
    assertInstanceOf(error, LlamaError);
    assertInstanceOf(error.cause, SyntaxError);
  } finally {
    restoreFetch();
  }
});
