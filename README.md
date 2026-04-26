# llama-native

**Still in alpha**

A lightweight Deno client for llama.cpp with zero dependencies. Supports
OpenAI-compatible chat and native GBNF grammar completions.

## Usage

```Typescript
import { Llama } from "@emrahcom/llama-native";

const llama = new Llama();
const res = await llama.chat.create({
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(res.choices[0].message.content);
```

See also [examples](examples).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file
for details.
