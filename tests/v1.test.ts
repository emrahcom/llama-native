import { assertEquals, assertStrictEquals } from "@std/assert";
import {
  Llama,
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
