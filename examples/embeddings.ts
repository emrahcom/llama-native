import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: "http://localhost:8080",
});

try {
  // Generate embeddings for a text string
  const res = await llama.embeddings.create({
    input: "Llama is an amazing animal.",
  });

  // Access the embedding vector from the first result
  const vector = res.data[0].embedding;

  console.log("Vector (first 5 values):", vector.slice(0, 5));
  console.log("Total dimensions:", vector.length);
} catch (e) {
  console.error(e);
}
