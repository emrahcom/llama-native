// Reports server properties via GET /props.
//
// Run against a local server on the default http://localhost:8080:
//
//   deno run --allow-net --allow-env examples/props.ts
//
// Override the server URL and supply an API key with environment variables:
//
//   LLAMA_BASE_URL=http://localhost:8080 \
//   LLAMA_API_KEY=secret \
//   deno run --allow-net --allow-env examples/props.ts

import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: Deno.env.get("LLAMA_BASE_URL"),
  apiKey: Deno.env.get("LLAMA_API_KEY"),
});

const props = await llama.props();
console.log(props.media_marker);
