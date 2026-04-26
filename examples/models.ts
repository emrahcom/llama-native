import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: "http://localhost:8080",
});

try {
  // Fetch the list of available models
  const res = await llama.models.list();

  console.log("Available models:");
  for (const model of res.data) {
    console.log(`- ID: ${model.id}`);
    console.log(`  Owned by: ${model.owned_by}`);
    console.log(
      `  Created: ${new Date(model.created * 1000).toLocaleString()}`,
    );
  }
} catch (e) {
  console.error(e);
}
