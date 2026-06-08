import { assertEquals, assertStrictEquals } from "@std/assert";
import {
  Llama,
  type V1ChatCompletionsChunk,
  type V1ChatCompletionsResponse,
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

// A representative tool definition, reused across the tool-calling tests.
const weatherTool = {
  type: "function" as const,
  function: {
    name: "get_weather",
    description: "Get the current weather for a city.",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
  },
};

Deno.test("v1.chat.completions sends tools and tool_choice in the JSON body", async () => {
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
      messages: [{ role: "user", content: "Weather in Paris?" }],
      tools: [weatherTool],
      tool_choice: "auto",
    });
    assertEquals(
      seenBody,
      JSON.stringify({
        messages: [{ role: "user", content: "Weather in Paris?" }],
        tools: [weatherTool],
        tool_choice: "auto",
      }),
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions sends an assistant tool_calls message and a tool result message in the body", async () => {
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
    const messages = [
      { role: "user" as const, content: "Weather in Paris?" },
      {
        role: "assistant" as const,
        content: null,
        tool_calls: [{
          id: "call_1",
          type: "function" as const,
          function: { name: "get_weather", arguments: '{"city":"Paris"}' },
        }],
      },
      {
        role: "tool" as const,
        tool_call_id: "call_1",
        content: '{"temp_c":18}',
      },
    ];
    await llama.v1.chat.completions({ messages });
    assertEquals(seenBody, JSON.stringify({ messages }));
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions returns a tool-call response with finish_reason tool_calls, null content, and tool_calls", async () => {
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
          content: null,
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: '{"city":"Paris"}' },
            },
          ],
        },
        finish_reason: "tool_calls",
      },
    ],
    usage: {
      prompt_tokens: 1,
      completion_tokens: 2,
      total_tokens: 3,
    },
  };
  stubFetch(() => Promise.resolve(new Response(JSON.stringify(payload))));
  try {
    const llama = new Llama();
    const result = await llama.v1.chat.completions({
      messages: [{ role: "user", content: "Weather in Paris?" }],
      tools: [weatherTool],
    });
    assertEquals(result, payload);
  } finally {
    restoreFetch();
  }
});

Deno.test("v1.chat.completions with stream: true yields tool-call delta fragments and a tool_calls finish_reason", async () => {
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
          content: null,
          tool_calls: [
            {
              index: 0,
              id: "call_1",
              type: "function",
              function: { name: "get_weather", arguments: "" },
            },
          ],
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
          tool_calls: [
            { index: 0, function: { arguments: '{"city":"Paris"}' } },
          ],
        },
        finish_reason: null,
      },
    ],
  };
  const last: V1ChatCompletionsChunk = {
    id: "chatcmpl-1",
    object: "chat.completion.chunk",
    created: 1700000000,
    model: "my-model",
    choices: [
      {
        index: 0,
        delta: {},
        finish_reason: "tool_calls",
      },
    ],
    usage: {
      prompt_tokens: 1,
      completion_tokens: 2,
      total_tokens: 3,
    },
  };
  stubFetch(() =>
    Promise.resolve(
      sseResponse([
        `data: ${JSON.stringify(first)}\n\n`,
        `data: ${JSON.stringify(second)}\n\n`,
        `data: ${JSON.stringify(last)}\n\n`,
        "data: [DONE]\n\n",
      ]),
    )
  );
  try {
    const llama = new Llama();
    const chunks = await collect(
      llama.v1.chat.completions({
        messages: [{ role: "user", content: "Weather in Paris?" }],
        tools: [weatherTool],
        tool_choice: "required",
        stream: true,
      }),
    );
    assertEquals(chunks, [first, second, last]);
  } finally {
    restoreFetch();
  }
});
