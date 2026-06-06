import { assertEquals, assertStrictEquals } from "@std/assert";
import {
  type CompletionChunk,
  type CompletionResponse,
  Llama,
  type LlamaOptions,
  type V1ChatCompletionsChunk,
  type V1ChatCompletionsResponse,
  type V1CompletionsChunk,
  type V1CompletionsResponse,
  type V1EmbeddingsResponse,
} from "@emrahcom/llama-native";

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

// The configuration is held privately, so it is observed through the request it
// produces: a GET /health with a stubbed fetch reveals the resolved URL and the
// headers (including any Authorization bearer token).
async function captureHealthRequest(
  options?: LlamaOptions,
): Promise<{ url: string; headers: Headers }> {
  let seenUrl = "";
  let seenHeaders: HeadersInit | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenHeaders = init?.headers;
    return Promise.resolve(new Response(JSON.stringify({ status: "ok" })));
  });
  try {
    await new Llama(options).health();
  } finally {
    restoreFetch();
  }
  return { url: seenUrl, headers: new Headers(seenHeaders) };
}

Deno.test("baseUrl defaults to llama-server's default when no options", async () => {
  const { url } = await captureHealthRequest();
  assertEquals(url, "http://localhost:8080/health");
});

Deno.test("baseUrl defaults when options is empty", async () => {
  const { url } = await captureHealthRequest({});
  assertEquals(url, "http://localhost:8080/health");
});

Deno.test("baseUrl defaults when undefined", async () => {
  const { url } = await captureHealthRequest({ baseUrl: undefined });
  assertEquals(url, "http://localhost:8080/health");
});

Deno.test("baseUrl defaults when falsy (empty string)", async () => {
  const { url } = await captureHealthRequest({ baseUrl: "" });
  assertEquals(url, "http://localhost:8080/health");
});

Deno.test("baseUrl is used as given when no trailing slash", async () => {
  const { url } = await captureHealthRequest({
    baseUrl: "http://example.com:9000",
  });
  assertEquals(url, "http://example.com:9000/health");
});

Deno.test("baseUrl strips a single trailing slash", async () => {
  const { url } = await captureHealthRequest({
    baseUrl: "http://example.com:9000/",
  });
  assertEquals(url, "http://example.com:9000/health");
});

Deno.test("baseUrl strips multiple trailing slashes", async () => {
  const { url } = await captureHealthRequest({
    baseUrl: "http://example.com:9000///",
  });
  assertEquals(url, "http://example.com:9000/health");
});

Deno.test("apiKey is sent as a bearer token when provided", async () => {
  const { headers } = await captureHealthRequest({ apiKey: "secret" });
  assertEquals(headers.get("Authorization"), "Bearer secret");
});

Deno.test("no Authorization header when apiKey not provided", async () => {
  const { headers } = await captureHealthRequest();
  assertStrictEquals(headers.get("Authorization"), null);
});

Deno.test("apiKey is not exposed on the public surface nor serialized", () => {
  const llama = new Llama({ apiKey: "secret" });
  // deno-lint-ignore no-explicit-any
  assertStrictEquals((llama as any).config, undefined);
  assertEquals(JSON.stringify(llama).includes("secret"), false);
});

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
    await llama.health();
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
    const result = await llama.health();
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
    const result = await llama.health();
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
    await llama.health({ signal: controller.signal });
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
    await llama.tokenize({ content: "hello" });
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
    await llama.tokenize({ content: "hello", add_special: true });
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
    await llama.tokenize({ content: "hello" });
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
    const result = await llama.tokenize({ content: "hello" });
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
    await llama.tokenize({ content: "hello" }, {
      signal: controller.signal,
    });
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.models issues GET /v1/models against the configured baseUrl", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  let seenBody: BodyInit | null | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    seenBody = init?.body;
    return Promise.resolve(
      new Response(JSON.stringify({ object: "list", data: [] })),
    );
  });
  try {
    const llama = new Llama({ baseUrl: "http://example.com:9000" });
    await llama.v1.models();
    assertEquals(seenUrl, "http://example.com:9000/v1/models");
    assertEquals(seenMethod, "GET");
    assertEquals(seenBody, undefined);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.models returns the parsed JSON body as V1ModelsResponse on HTTP 200", async () => {
  const payload = {
    object: "list",
    data: [
      {
        id: "my-model",
        object: "model",
        created: 1700000000,
        owned_by: "user",
      },
    ],
  };
  stubFetch(() => Promise.resolve(new Response(JSON.stringify(payload))));
  try {
    const llama = new Llama();
    const result = await llama.v1.models();
    assertEquals(result, payload);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.models forwards the signal option to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(
      new Response(JSON.stringify({ object: "list", data: [] })),
    );
  });
  try {
    const llama = new Llama();
    const controller = new AbortController();
    await llama.v1.models({ signal: controller.signal });
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.completions issues POST /v1/completions against the configured baseUrl", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          id: "cmpl-1",
          object: "text_completion",
          created: 1700000000,
          model: "my-model",
          choices: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        }),
      ),
    );
  });
  try {
    const llama = new Llama({ baseUrl: "http://example.com:9000" });
    await llama.v1.completions({ prompt: "Hello" });
    assertEquals(seenUrl, "http://example.com:9000/v1/completions");
    assertEquals(seenMethod, "POST");
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.completions sends the V1CompletionsRequest as the JSON body, preserving optional fields", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          id: "cmpl-1",
          object: "text_completion",
          created: 1700000000,
          model: "my-model",
          choices: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        }),
      ),
    );
  });
  try {
    const llama = new Llama();
    await llama.v1.completions({
      prompt: "Hello",
      model: "my-model",
      max_tokens: 1024,
      stop: ["\n"],
      temperature: 0.7,
    });
    assertEquals(
      seenBody,
      JSON.stringify({
        prompt: "Hello",
        model: "my-model",
        max_tokens: 1024,
        stop: ["\n"],
        temperature: 0.7,
      }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.completions omits optional fields from the body when not provided", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          id: "cmpl-1",
          object: "text_completion",
          created: 1700000000,
          model: "my-model",
          choices: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        }),
      ),
    );
  });
  try {
    const llama = new Llama();
    await llama.v1.completions({ prompt: "Hello" });
    assertEquals(seenBody, JSON.stringify({ prompt: "Hello" }));
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.completions returns the parsed JSON body as V1CompletionsResponse on HTTP 200", async () => {
  const payload: V1CompletionsResponse = {
    id: "cmpl-1",
    object: "text_completion",
    created: 1700000000,
    model: "my-model",
    choices: [
      {
        index: 0,
        text: " world",
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 1,
      completion_tokens: 2,
      total_tokens: 3,
    },
    system_fingerprint: "b9300",
  };
  stubFetch(() => Promise.resolve(new Response(JSON.stringify(payload))));
  try {
    const llama = new Llama();
    const result = await llama.v1.completions({ prompt: "Hello" });
    assertEquals(result, payload);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.completions forwards the signal option to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          id: "cmpl-1",
          object: "text_completion",
          created: 1700000000,
          model: "my-model",
          choices: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        }),
      ),
    );
  });
  try {
    const llama = new Llama();
    const controller = new AbortController();
    await llama.v1.completions({ prompt: "Hello" }, {
      signal: controller.signal,
    });
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

const encoder = new TextEncoder();

// Builds a streaming Response whose body emits the given chunks in order,
// then closes.
function sseResponse(chunks: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
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

Deno.test("v1.completions with stream: true issues POST /v1/completions against the configured baseUrl", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    return Promise.resolve(sseResponse(["data: [DONE]\n\n"]));
  });
  try {
    const llama = new Llama({ baseUrl: "http://example.com:9000" });
    await collect(llama.v1.completions({ prompt: "Hello", stream: true }));
    assertEquals(seenUrl, "http://example.com:9000/v1/completions");
    assertEquals(seenMethod, "POST");
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.completions with stream: true sends the V1CompletionsRequest including stream as the JSON body", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(sseResponse(["data: [DONE]\n\n"]));
  });
  try {
    const llama = new Llama();
    await collect(
      llama.v1.completions({
        prompt: "Hello",
        max_tokens: 1024,
        stream: true,
      }),
    );
    assertEquals(
      seenBody,
      JSON.stringify({ prompt: "Hello", max_tokens: 1024, stream: true }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.completions with stream: true yields parsed V1CompletionsChunk values in order", async () => {
  const first: V1CompletionsChunk = {
    id: "cmpl-1",
    object: "text_completion",
    created: 1700000000,
    model: "my-model",
    choices: [
      {
        index: 0,
        text: " world",
        finish_reason: null,
      },
    ],
  };
  const second: V1CompletionsChunk = {
    id: "cmpl-1",
    object: "text_completion",
    created: 1700000000,
    model: "my-model",
    choices: [
      {
        index: 0,
        text: "!",
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 1,
      completion_tokens: 2,
      total_tokens: 3,
    },
    system_fingerprint: "b9300",
  };
  stubFetch(() =>
    Promise.resolve(
      sseResponse([
        `data: ${JSON.stringify(first)}\n\n`,
        `data: ${JSON.stringify(second)}\n\n`,
        "data: [DONE]\n\n",
      ]),
    )
  );
  try {
    const llama = new Llama();
    const chunks = await collect(
      llama.v1.completions({ prompt: "Hello", stream: true }),
    );
    assertEquals(chunks, [first, second]);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.completions with stream: true forwards the signal option to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(sseResponse(["data: [DONE]\n\n"]));
  });
  try {
    const llama = new Llama();
    const controller = new AbortController();
    await collect(
      llama.v1.completions({ prompt: "Hello", stream: true }, {
        signal: controller.signal,
      }),
    );
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions issues POST /v1/chat/completions against the configured baseUrl", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          id: "chatcmpl-1",
          object: "chat.completion",
          created: 1700000000,
          model: "my-model",
          choices: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        }),
      ),
    );
  });
  try {
    const llama = new Llama({ baseUrl: "http://example.com:9000" });
    await llama.v1.chat.completions({
      messages: [{ role: "user", content: "Hello" }],
    });
    assertEquals(seenUrl, "http://example.com:9000/v1/chat/completions");
    assertEquals(seenMethod, "POST");
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions sends the V1ChatCompletionsRequest as the JSON body, preserving optional fields", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          id: "chatcmpl-1",
          object: "chat.completion",
          created: 1700000000,
          model: "my-model",
          choices: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        }),
      ),
    );
  });
  try {
    const llama = new Llama();
    await llama.v1.chat.completions({
      messages: [
        { role: "system", content: "Be brief." },
        { role: "user", content: "Hello" },
      ],
      model: "my-model",
      max_tokens: 1024,
      stop: ["\n"],
      temperature: 0.7,
    });
    assertEquals(
      seenBody,
      JSON.stringify({
        messages: [
          { role: "system", content: "Be brief." },
          { role: "user", content: "Hello" },
        ],
        model: "my-model",
        max_tokens: 1024,
        stop: ["\n"],
        temperature: 0.7,
      }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions omits optional fields from the body when not provided", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          id: "chatcmpl-1",
          object: "chat.completion",
          created: 1700000000,
          model: "my-model",
          choices: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        }),
      ),
    );
  });
  try {
    const llama = new Llama();
    await llama.v1.chat.completions({
      messages: [{ role: "user", content: "Hello" }],
    });
    assertEquals(
      seenBody,
      JSON.stringify({ messages: [{ role: "user", content: "Hello" }] }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions returns the parsed JSON body as V1ChatCompletionsResponse on HTTP 200", async () => {
  const payload: V1ChatCompletionsResponse = {
    id: "chatcmpl-1",
    object: "chat.completion",
    created: 1700000000,
    model: "my-model",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: "Hello there!",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 1,
      completion_tokens: 2,
      total_tokens: 3,
    },
    system_fingerprint: "b9300",
  };
  stubFetch(() => Promise.resolve(new Response(JSON.stringify(payload))));
  try {
    const llama = new Llama();
    const result = await llama.v1.chat.completions({
      messages: [{ role: "user", content: "Hello" }],
    });
    assertEquals(result, payload);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions forwards the signal option to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          id: "chatcmpl-1",
          object: "chat.completion",
          created: 1700000000,
          model: "my-model",
          choices: [],
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        }),
      ),
    );
  });
  try {
    const llama = new Llama();
    const controller = new AbortController();
    await llama.v1.chat.completions({
      messages: [{ role: "user", content: "Hello" }],
    }, {
      signal: controller.signal,
    });
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions with stream: true issues POST /v1/chat/completions against the configured baseUrl", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    return Promise.resolve(sseResponse(["data: [DONE]\n\n"]));
  });
  try {
    const llama = new Llama({ baseUrl: "http://example.com:9000" });
    await collect(
      llama.v1.chat.completions({
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
      }),
    );
    assertEquals(seenUrl, "http://example.com:9000/v1/chat/completions");
    assertEquals(seenMethod, "POST");
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions with stream: true sends the V1ChatCompletionsRequest including stream as the JSON body", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(sseResponse(["data: [DONE]\n\n"]));
  });
  try {
    const llama = new Llama();
    await collect(
      llama.v1.chat.completions({
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1024,
        stream: true,
      }),
    );
    assertEquals(
      seenBody,
      JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1024,
        stream: true,
      }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions with stream: true yields parsed V1ChatCompletionsChunk values in order", async () => {
  const first: V1ChatCompletionsChunk = {
    id: "chatcmpl-1",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "my-model",
    choices: [
      {
        index: 0,
        delta: {
          role: "assistant",
          content: "Hello",
        },
        finish_reason: null,
      },
    ],
  };
  const second: V1ChatCompletionsChunk = {
    id: "chatcmpl-1",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "my-model",
    choices: [
      {
        index: 0,
        delta: {
          content: " there!",
        },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: 1,
      completion_tokens: 2,
      total_tokens: 3,
    },
    system_fingerprint: "b9300",
  };
  stubFetch(() =>
    Promise.resolve(
      sseResponse([
        `data: ${JSON.stringify(first)}\n\n`,
        `data: ${JSON.stringify(second)}\n\n`,
        "data: [DONE]\n\n",
      ]),
    )
  );
  try {
    const llama = new Llama();
    const chunks = await collect(
      llama.v1.chat.completions({
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
      }),
    );
    assertEquals(chunks, [first, second]);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions with stream: true forwards the signal option to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(sseResponse(["data: [DONE]\n\n"]));
  });
  try {
    const llama = new Llama();
    const controller = new AbortController();
    await collect(
      llama.v1.chat.completions({
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
      }, {
        signal: controller.signal,
      }),
    );
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

// A representative finished native completion, reused where the parsed value is
// not asserted. The `timings` block carries the full performance measurement.
const completionResponse: CompletionResponse = {
  content: " world",
  stop: true,
  model: "my-model",
  stop_type: "eos",
  stopping_word: "",
  tokens_predicted: 2,
  tokens_evaluated: 1,
  tokens_cached: 0,
  truncated: false,
  timings: {
    prompt_n: 1,
    prompt_ms: 1,
    prompt_per_token_ms: 1,
    prompt_per_second: 1000,
    predicted_n: 2,
    predicted_ms: 2,
    predicted_per_token_ms: 1,
    predicted_per_second: 1000,
  },
};

Deno.test("completion issues POST /completion against the configured baseUrl", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    return Promise.resolve(new Response(JSON.stringify(completionResponse)));
  });
  try {
    const llama = new Llama({ baseUrl: "http://example.com:9000" });
    await llama.completion({ prompt: "Hello" });
    assertEquals(seenUrl, "http://example.com:9000/completion");
    assertEquals(seenMethod, "POST");
  } finally {
    restoreFetch();
  }
});

Deno.test("completion sends the CompletionRequest as the JSON body, preserving optional fields", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(new Response(JSON.stringify(completionResponse)));
  });
  try {
    const llama = new Llama();
    await llama.completion({
      prompt: "Hello",
      n_predict: 1024,
      stop: ["\n"],
      temperature: 0.7,
    });
    assertEquals(
      seenBody,
      JSON.stringify({
        prompt: "Hello",
        n_predict: 1024,
        stop: ["\n"],
        temperature: 0.7,
      }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("completion omits optional fields from the body when not provided", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(new Response(JSON.stringify(completionResponse)));
  });
  try {
    const llama = new Llama();
    await llama.completion({ prompt: "Hello" });
    assertEquals(seenBody, JSON.stringify({ prompt: "Hello" }));
  } finally {
    restoreFetch();
  }
});

Deno.test("completion accepts the array prompt form built from text and token IDs", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(new Response(JSON.stringify(completionResponse)));
  });
  try {
    const llama = new Llama();
    await llama.completion({ prompt: ["Hello", 123, " world"] });
    assertEquals(
      seenBody,
      JSON.stringify({ prompt: ["Hello", 123, " world"] }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("completion returns the parsed JSON body as CompletionResponse on HTTP 200", async () => {
  stubFetch(() =>
    Promise.resolve(new Response(JSON.stringify(completionResponse)))
  );
  try {
    const llama = new Llama();
    const result = await llama.completion({ prompt: "Hello" });
    assertEquals(result, completionResponse);
  } finally {
    restoreFetch();
  }
});

Deno.test("completion forwards the signal option to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(new Response(JSON.stringify(completionResponse)));
  });
  try {
    const llama = new Llama();
    const controller = new AbortController();
    await llama.completion({ prompt: "Hello" }, { signal: controller.signal });
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

Deno.test("completion with stream: true issues POST /completion against the configured baseUrl", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    return Promise.resolve(
      sseResponse([`data: ${JSON.stringify(completionResponse)}\n\n`]),
    );
  });
  try {
    const llama = new Llama({ baseUrl: "http://example.com:9000" });
    await collect(llama.completion({ prompt: "Hello", stream: true }));
    assertEquals(seenUrl, "http://example.com:9000/completion");
    assertEquals(seenMethod, "POST");
  } finally {
    restoreFetch();
  }
});

Deno.test("completion with stream: true sends the CompletionRequest including stream as the JSON body", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(
      sseResponse([`data: ${JSON.stringify(completionResponse)}\n\n`]),
    );
  });
  try {
    const llama = new Llama();
    await collect(
      llama.completion({ prompt: "Hello", n_predict: 8, stream: true }),
    );
    assertEquals(
      seenBody,
      JSON.stringify({ prompt: "Hello", n_predict: 8, stream: true }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("completion with stream: true yields parsed CompletionChunk values in order, ending after the stop chunk with no [DONE]", async () => {
  const first: CompletionChunk = {
    content: " world",
    stop: false,
  };
  const last: CompletionChunk = {
    content: "!",
    stop: true,
    model: "my-model",
    stop_type: "eos",
    stopping_word: "",
    tokens_predicted: 2,
    tokens_evaluated: 1,
    tokens_cached: 0,
    truncated: false,
    timings: {
      prompt_n: 1,
      prompt_ms: 1,
      prompt_per_token_ms: 1,
      prompt_per_second: 1000,
      predicted_n: 2,
      predicted_ms: 2,
      predicted_per_token_ms: 1,
      predicted_per_second: 1000,
    },
  };
  stubFetch(() =>
    Promise.resolve(
      sseResponse([
        `data: ${JSON.stringify(first)}\n\n`,
        `data: ${JSON.stringify(last)}\n\n`,
      ]),
    )
  );
  try {
    const llama = new Llama();
    const chunks = await collect(
      llama.completion({ prompt: "Hello", stream: true }),
    );
    assertEquals(chunks, [first, last]);
  } finally {
    restoreFetch();
  }
});

Deno.test("completion with stream: true forwards the signal option to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(
      sseResponse([`data: ${JSON.stringify(completionResponse)}\n\n`]),
    );
  });
  try {
    const llama = new Llama();
    const controller = new AbortController();
    await collect(
      llama.completion({ prompt: "Hello", stream: true }, {
        signal: controller.signal,
      }),
    );
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.embeddings issues POST /v1/embeddings against the configured baseUrl", async () => {
  let seenUrl: string | undefined;
  let seenMethod: string | undefined;
  stubFetch((input, init) => {
    seenUrl = input.toString();
    seenMethod = init?.method;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          object: "list",
          data: [],
          model: "my-model",
          usage: { prompt_tokens: 0, total_tokens: 0 },
        }),
      ),
    );
  });
  try {
    const llama = new Llama({ baseUrl: "http://example.com:9000" });
    await llama.v1.embeddings({ input: "Hello" });
    assertEquals(seenUrl, "http://example.com:9000/v1/embeddings");
    assertEquals(seenMethod, "POST");
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.embeddings sends the V1EmbeddingsRequest as the JSON body, preserving the model field and batch input", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          object: "list",
          data: [],
          model: "my-model",
          usage: { prompt_tokens: 0, total_tokens: 0 },
        }),
      ),
    );
  });
  try {
    const llama = new Llama();
    await llama.v1.embeddings({
      input: ["Hello", "World"],
      model: "my-model",
    });
    assertEquals(
      seenBody,
      JSON.stringify({ input: ["Hello", "World"], model: "my-model" }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.embeddings omits the optional model field from the body when not provided", async () => {
  let seenBody: string | undefined;
  stubFetch((_input, init) => {
    seenBody = init?.body as string | undefined;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          object: "list",
          data: [],
          model: "my-model",
          usage: { prompt_tokens: 0, total_tokens: 0 },
        }),
      ),
    );
  });
  try {
    const llama = new Llama();
    await llama.v1.embeddings({ input: "Hello" });
    assertEquals(seenBody, JSON.stringify({ input: "Hello" }));
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.embeddings returns the parsed JSON body as V1EmbeddingsResponse on HTTP 200", async () => {
  const payload: V1EmbeddingsResponse = {
    object: "list",
    data: [
      { object: "embedding", index: 0, embedding: [0.1, 0.2, 0.3] },
      { object: "embedding", index: 1, embedding: [0.4, 0.5, 0.6] },
    ],
    model: "my-model",
    usage: { prompt_tokens: 4, total_tokens: 4 },
  };
  stubFetch(() => Promise.resolve(new Response(JSON.stringify(payload))));
  try {
    const llama = new Llama();
    const result = await llama.v1.embeddings({ input: ["Hello", "World"] });
    assertEquals(result, payload);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.embeddings forwards the signal option to fetch", async () => {
  let seenSignal: AbortSignal | null | undefined;
  stubFetch((_input, init) => {
    seenSignal = init?.signal;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          object: "list",
          data: [],
          model: "my-model",
          usage: { prompt_tokens: 0, total_tokens: 0 },
        }),
      ),
    );
  });
  try {
    const llama = new Llama();
    const controller = new AbortController();
    await llama.v1.embeddings({ input: "Hello" }, {
      signal: controller.signal,
    });
    assertStrictEquals(seenSignal, controller.signal);
  } finally {
    restoreFetch();
  }
});
