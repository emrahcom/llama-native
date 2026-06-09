// Sends an image alongside text via POST /v1/chat/completions, using a
// V1ContentPart array as the user message content. A user message can also
// carry audio with an input_audio part (base64 data plus a "wav"/"mp3" format);
// see specs/endpoints/v1-chat-completions.md.
//
// Requires a multimodal model with its projector loaded: with -hf the projector
// loads automatically (--mmproj-auto, on by default), or pass --mmproj FILE for
// a local projector (see specs/endpoints/v1-chat-completions.md).
//
// Run against such a server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env \
//     examples/v1-chat-completions-multimodal.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env \
//     examples/v1-chat-completions-multimodal.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

// The image source is an https URL or a base64 data URI. Replace this with your
// own image.
const imageUrl =
  "https://raw.githubusercontent.com/ggml-org/llama.cpp/master/media/llama0-logo.png";

// A user message whose content is an array of parts: text plus an image.
const result = await llama.v1.chat.completions({
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What is in this image?" },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ],
  max_tokens: 1024,
});
console.log(result.choices[0].message.content);
