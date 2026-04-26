import { Llama } from "@emrahcom/llama-native";

// Initialize the client
const llama = new Llama({
  baseUrl: "http://localhost:8080",
});

try {
  // Request a completion from the native endpoint
  const res = await llama.native.create({
    prompt: "The capital of France is",
    n_predict: 10,
  });

  // Output the result
  console.log("Model output:", res.content);
} catch (e) {
  console.error(e);
}
