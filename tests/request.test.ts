import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import {
  LlamaError,
  LlamaHTTPError,
  LlamaStreamError,
} from "@emrahcom/llama-native";
import { request, requestStream } from "../src/request/mod.ts";
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

const encoder = new TextEncoder();

// Builds a streaming Response whose body emits the given chunks in order,
// then closes. Splitting an SSE event across chunks exercises buffering.
function sseResponse(chunks: string[], init?: ResponseInit): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(body, init);
}

// Builds a streaming Response that emits one chunk and then errors mid-stream.
// The chunk is enqueued in `start` and the error is raised on the next `pull`,
// so the chunk is delivered to the consumer before the error surfaces.
function sseThenError(chunk: string, cause: unknown): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(chunk));
    },
    pull(controller) {
      controller.error(cause);
    },
  });
  return new Response(body);
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of iterable) {
    values.push(value);
  }
  return values;
}

Deno.test("requestStream is lazy: fetch does not run until the first iteration", async () => {
  let calls = 0;
  stubFetch(() => {
    calls++;
    return Promise.resolve(sseResponse(['data: {"i":1}\n\ndata: [DONE]\n\n']));
  });
  try {
    const iterable = requestStream({ config, method: "GET", path: "/stream" });
    assertStrictEquals(calls, 0);
    const iterator = iterable[Symbol.asyncIterator]();
    await iterator.next();
    assertStrictEquals(calls, 1);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream yields parsed JSON payloads in order", async () => {
  stubFetch(() =>
    Promise.resolve(
      sseResponse(['data: {"i":1}\n\ndata: {"i":2}\n\ndata: [DONE]\n\n']),
    )
  );
  try {
    const values = await collect(
      requestStream({ config, method: "GET", path: "/stream" }),
    );
    assertEquals(values, [{ i: 1 }, { i: 2 }]);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream buffers events split across read chunks", async () => {
  stubFetch(() =>
    Promise.resolve(
      sseResponse(['data: {"i":1}\n\nda', 'ta: {"i":2}\n\ndata: [DONE]\n\n']),
    )
  );
  try {
    const values = await collect(
      requestStream({ config, method: "GET", path: "/stream" }),
    );
    assertEquals(values, [{ i: 1 }, { i: 2 }]);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream joins multiple data lines in one event with a newline", async () => {
  stubFetch(() =>
    Promise.resolve(sseResponse(['data: {"a":\ndata: 1}\n\ndata: [DONE]\n\n']))
  );
  try {
    const values = await collect(
      requestStream({ config, method: "GET", path: "/stream" }),
    );
    assertEquals(values, [{ a: 1 }]);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream ignores lines that are not data lines", async () => {
  stubFetch(() =>
    Promise.resolve(
      sseResponse([
        ': a comment\nevent: message\nid: 7\nretry: 100\ndata: {"ok":true}\n\ndata: [DONE]\n\n',
      ]),
    )
  );
  try {
    const values = await collect(
      requestStream({ config, method: "GET", path: "/stream" }),
    );
    assertEquals(values, [{ ok: true }]);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream strips a single leading space, treating `data: [DONE]` as the terminator", async () => {
  // If the leading space after `data:` were not stripped, the payload would be
  // " [DONE]", which would fail the `[DONE]` check and be JSON-parsed instead.
  stubFetch(() => Promise.resolve(sseResponse(["data: [DONE]\n\n"])));
  try {
    const values = await collect(
      requestStream({ config, method: "GET", path: "/stream" }),
    );
    assertEquals(values, []);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream completes at [DONE] and ignores events after it", async () => {
  stubFetch(() =>
    Promise.resolve(
      sseResponse(['data: {"i":1}\n\ndata: [DONE]\n\ndata: {"i":99}\n\n']),
    )
  );
  try {
    const values = await collect(
      requestStream({ config, method: "GET", path: "/stream" }),
    );
    assertEquals(values, [{ i: 1 }]);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream throws LlamaStreamError when the body ends without [DONE]", async () => {
  stubFetch(() => Promise.resolve(sseResponse(['data: {"i":1}\n\n'])));
  try {
    const iterable = requestStream({ config, method: "GET", path: "/stream" });
    const collected: unknown[] = [];
    const error = await assertRejects(
      async () => {
        for await (const value of iterable) {
          collected.push(value);
        }
      },
      LlamaStreamError,
      "Stream ended without [DONE] marker",
    );
    assertEquals(error.name, "LlamaStreamError");
    assertEquals(collected, [{ i: 1 }]);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream throws LlamaStreamError when a response has no body", async () => {
  stubFetch(() => Promise.resolve(new Response(null, { status: 204 })));
  try {
    await assertRejects(
      () => collect(requestStream({ config, method: "GET", path: "/stream" })),
      LlamaStreamError,
      "Streaming response had no body",
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream throws LlamaStreamError on an unparseable data payload", async () => {
  stubFetch(() => Promise.resolve(sseResponse(["data: not json\n\n"])));
  try {
    const error = await assertRejects(
      () => collect(requestStream({ config, method: "GET", path: "/stream" })),
      LlamaStreamError,
      "Failed to parse stream chunk",
    );
    assertInstanceOf(error.cause, SyntaxError);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream throws LlamaHTTPError on a non-2xx response before yielding", async () => {
  stubFetch(() => Promise.resolve(new Response("nope", { status: 503 })));
  try {
    const error = await assertRejects(
      () =>
        collect(
          requestStream({ config, method: "POST", path: "/v1/completions" }),
        ),
      LlamaHTTPError,
      "HTTP 503 from POST /v1/completions",
    );
    assertEquals(error.status, 503);
    assertEquals(error.body, "nope");
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream propagates a fetch AbortError unchanged", async () => {
  const abort = new DOMException("aborted", "AbortError");
  stubFetch(() => Promise.reject(abort));
  try {
    const error = await assertRejects(() =>
      collect(requestStream({ config, method: "GET", path: "/stream" }))
    );
    assertStrictEquals(error, abort);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream wraps a non-AbortError fetch rejection in LlamaError with cause", async () => {
  const cause = new TypeError("network down");
  stubFetch(() => Promise.reject(cause));
  try {
    const error = await assertRejects(
      () =>
        collect(
          requestStream({ config, method: "POST", path: "/v1/completions" }),
        ),
      LlamaError,
      "POST /v1/completions request failed",
    );
    assertEquals(error.name, "LlamaError");
    assertStrictEquals(error.cause, cause);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream re-throws a mid-stream AbortError unchanged", async () => {
  const abort = new DOMException("aborted", "AbortError");
  stubFetch(() => Promise.resolve(sseThenError('data: {"i":1}\n\n', abort)));
  try {
    const iterable = requestStream({ config, method: "GET", path: "/stream" });
    const collected: unknown[] = [];
    const error = await assertRejects(async () => {
      for await (const value of iterable) {
        collected.push(value);
      }
    });
    assertStrictEquals(error, abort);
    assertEquals(collected, [{ i: 1 }]);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream wraps a mid-stream network error in LlamaError with cause", async () => {
  const cause = new TypeError("connection reset");
  stubFetch(() => Promise.resolve(sseThenError('data: {"i":1}\n\n', cause)));
  try {
    const iterable = requestStream({
      config,
      method: "POST",
      path: "/v1/completions",
    });
    const collected: unknown[] = [];
    const error = await assertRejects(
      async () => {
        for await (const value of iterable) {
          collected.push(value);
        }
      },
      LlamaError,
      "POST /v1/completions stream failed",
    );
    assertEquals(error.name, "LlamaError");
    assertStrictEquals(error.cause, cause);
    assertEquals(collected, [{ i: 1 }]);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream sends method, path, and serialized body through the shared setup", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  let seenBody: BodyInit | null | undefined;
  let contentType: string | null = null;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    seenBody = init?.body;
    contentType = new Headers(init?.headers).get("Content-Type");
    return Promise.resolve(sseResponse(["data: [DONE]\n\n"]));
  });
  try {
    const body = { prompt: "hi", stream: true };
    await collect(
      requestStream({ config, method: "POST", path: "/v1/completions", body }),
    );
    assertEquals(seenUrl, "http://example.com:9000/v1/completions");
    assertEquals(seenMethod, "POST");
    assertEquals(seenBody, JSON.stringify(body));
    assertEquals(contentType, "application/json");
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream forwards the signal to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(sseResponse(["data: [DONE]\n\n"]));
  });
  try {
    const controller = new AbortController();
    await collect(
      requestStream({
        config,
        method: "GET",
        path: "/stream",
        signal: controller.signal,
      }),
    );
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream stops cleanly when the consumer breaks out early", async () => {
  stubFetch(() =>
    Promise.resolve(
      sseResponse(['data: {"i":1}\n\ndata: {"i":2}\n\ndata: [DONE]\n\n']),
    )
  );
  try {
    const collected: unknown[] = [];
    for await (
      const value of requestStream({ config, method: "GET", path: "/stream" })
    ) {
      collected.push(value);
      break;
    }
    assertEquals(collected, [{ i: 1 }]);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream in native mode yields every data payload and ends cleanly when the stream ends", async () => {
  stubFetch(() =>
    Promise.resolve(
      sseResponse([
        'data: {"content":"a","stop":false}\n\n',
        'data: {"content":"b","stop":true}\n\n',
      ]),
    )
  );
  try {
    const values = await collect(
      requestStream({ config, method: "POST", path: "/completion" }, "native"),
    );
    assertEquals(values, [
      { content: "a", stop: false },
      { content: "b", stop: true },
    ]);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream in native mode does not treat [DONE] as a terminator", async () => {
  stubFetch(() =>
    Promise.resolve(sseResponse(['data: [DONE]\n\ndata: {"i":1}\n\n']))
  );
  try {
    const error = await assertRejects(
      () =>
        collect(
          requestStream(
            { config, method: "POST", path: "/completion" },
            "native",
          ),
        ),
      LlamaStreamError,
      "Failed to parse stream chunk",
    );
    assertInstanceOf(error.cause, SyntaxError);
  } finally {
    restoreFetch();
  }
});

Deno.test("requestStream in native mode surfaces an unparseable payload as LlamaStreamError", async () => {
  stubFetch(() => Promise.resolve(sseResponse(["data: not json\n\n"])));
  try {
    await assertRejects(
      () =>
        collect(
          requestStream(
            { config, method: "POST", path: "/completion" },
            "native",
          ),
        ),
      LlamaStreamError,
      "Failed to parse stream chunk",
    );
  } finally {
    restoreFetch();
  }
});
