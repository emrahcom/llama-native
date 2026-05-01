import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: "http://localhost:8080",
});

try {
  // Fetch the list of available models
  const res = await llama.models.list();

  console.log("Available models:");
  for (const model of res.data) {
    const createdAt = new Date(model.created * 1000).toLocaleString();

    console.log(`- ID: ${model.id}`);
    console.log(`  Owned by: ${model.owned_by}`);
    console.log(`  Created: ${createdAt}`);
  }
} catch (e) {
  console.error(e);
}
