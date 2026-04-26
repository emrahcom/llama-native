import { Llama } from "@emrahcom/llama-native";

const llama = new Llama({
  baseUrl: "http://localhost:8080",
});

try {
  const stream = await llama.chat.stream({
    messages: [
      { role: "user", content: "Tell me a short story about a mountain." },
    ],
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;

    if (content) {
      const text = new TextEncoder().encode(content);
      Deno.stdout.writeSync(text);
    }
  }
} catch (e) {
  console.error(e);
}
