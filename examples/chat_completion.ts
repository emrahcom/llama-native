import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: "http://localhost:8080",
});

try {
  const res = await llama.chat.create({
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "What is the capital of France?" },
    ],
  });

  console.log("Assistant:", res.choices[0].message.content);
} catch (e) {
  console.error(e);
}
