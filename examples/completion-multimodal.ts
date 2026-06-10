// Sends an image alongside text via POST /completion, llama-server's native
// completion API. A multimodal request uses prompt_string with one <__media__>
// marker per entry in multimodal_data, an array of base64-encoded media.
//
// Requires a multimodal model with its projector loaded: with -hf the projector
// loads automatically (--mmproj-auto, on by default), or pass --mmproj FILE for
// a local projector (see specs/endpoints/completion.md).
//
// Run against such a server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env examples/completion-multimodal.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/completion-multimodal.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

// The native endpoint takes base64 media, not a URL. Fetch a real image (the
// llama.cpp project logo) and base64-encode it; replace it with your own image.
const imageUrl =
  "https://raw.githubusercontent.com/ggml-org/llama.cpp/master/media/llama0-logo.png";
const bytes = new Uint8Array(await (await fetch(imageUrl)).arrayBuffer());
const base64 = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));

// prompt_string carries one <__media__> marker for the single media entry.
const result = await llama.completion({
  prompt_string: "<__media__>\nWhat is in this image?",
  multimodal_data: [base64],
  n_predict: 1024,
});
console.log(result.content);
