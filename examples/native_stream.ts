import { Llama } from "@emrahcom/llama-native";

// Initialize the client
const llama = new Llama({
  baseUrl: "http://localhost:8080",
});

try {
  // Request a streaming completion from the native endpoint
  const stream = await llama.native.stream({
    prompt: "Write a short poem about a mechanical bird.",
  });

  console.log("Response starting:\n");

  // Iterate over the stream chunks as they arrive
  for await (const chunk of stream) {
    const text = new TextEncoder().encode(chunk.content);
    Deno.stdout.writeSync(text);
  }

  console.log("\n\nStream finished.");
} catch (e) {
  console.error(e);
}
