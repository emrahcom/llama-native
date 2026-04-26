import { Llama, utils } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: "http://localhost:8080",
});

try {
  // Get the first vector
  const res1 = await llama.embeddings.create({
    input: "The cat is sleeping on the couch.",
  });
  const vectorA = res1.data[0].embedding;

  // Get the second vector
  const res2 = await llama.embeddings.create({
    input: "A feline is resting on the sofa.",
  });
  const vectorB = res2.data[0].embedding;

  // Compare the two vectors to see how similar they are
  const score = utils.cosineSimilarity(vectorA, vectorB);

  // A score near 1.0 means the meanings are very close
  console.log(`Similarity: ${score.toFixed(4)}`);
} catch (e) {
  console.error(e);
}
