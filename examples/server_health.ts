import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: "http://localhost:8080",
});

try {
  const isHealthy = await llama.health();

  if (isHealthy) {
    console.log("healthy");
  } else {
    console.log("unhealthy");
  }
} catch (e) {
  console.error(e);
}
