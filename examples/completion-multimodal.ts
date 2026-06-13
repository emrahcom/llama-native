// Sends an image alongside text via POST /completion, llama-server's native
// completion API, using a CompletionMultimodalPrompt. The prompt_string holds
// the text with one media marker per item, and multimodal_data carries the
// base64-encoded media (images or audio); see specs/endpoints/completion.md.
//
// The marker is the server's media_marker, read from GET /props (llama.props()),
// placed in prompt_string once per entry in multimodal_data.
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

// The marker that stands in for one media item within the prompt.
const { media_marker } = await llama.props();

// A real, decodable image (the llama.cpp project logo), base64-encoded. Replace
// this with your own image.
const imageUrl =
  "https://raw.githubusercontent.com/ggml-org/llama.cpp/master/media/llama0-logo.png";
const bytes = new Uint8Array(await (await fetch(imageUrl)).arrayBuffer());
let binary = "";
for (const byte of bytes) binary += String.fromCharCode(byte);
const base64 = btoa(binary);

// The prompt_string carries the marker once per media item in multimodal_data.
const result = await llama.completion({
  prompt: {
    prompt_string: `What is in this image? ${media_marker}`,
    multimodal_data: [base64],
  },
  n_predict: 1024,
});
console.log(result.content);
