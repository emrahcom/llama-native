# llama-native

A lightweight, typed Deno client for [llama-server], the HTTP server in
[llama.cpp]. No third-party dependencies.

It wraps both the native and OpenAI-compatible (`/v1`) API families: text
generation with streaming, chat with tool calling and multimodal (image and
audio) input, embeddings, tokenize/detokenize, model listing, and health.

## Usage

Assuming that `llama-server` is running in your local environment...

Native completion:

```ts
import { Llama } from "jsr:@emrahcom/llama-native";

const llama = new Llama();
const res = await llama.completion({
  prompt: "The capital of France is",
});

console.log(res.content);
```

OpenAI-compatible chat completion:

```ts
import { Llama } from "jsr:@emrahcom/llama-native";

const llama = new Llama();
const res = await llama.v1.chat.completions({
  messages: [
    { role: "user", content: "Hello!" },
  ],
});

console.log(res.choices[0].message.content);
```

See also [examples](examples).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.

[llama-server]: https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md
[llama.cpp]: https://github.com/ggml-org/llama.cpp
