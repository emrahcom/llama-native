import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: "http://localhost:8080",
});

try {
  const text = "Llama is an amazing animal.";

  // Tokenize: Convert text into a list of token IDs
  const { tokens } = await llama.native.tokenize(text);
  console.log("Token IDs:", tokens);

  // Detokenize: Convert those IDs back into human-readable text
  const res = await llama.native.detokenize(tokens);
  console.log("Original text:", res.content);
} catch (e) {
  console.error(e);
}
