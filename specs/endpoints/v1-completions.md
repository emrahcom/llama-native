# /v1/completions

Generates a text completion for a prompt.

## Location

`src/v1/`

## TypeScript surface

```ts
export interface CompletionsRequest {
  prompt: string | string[] | number[] | number[][];
  model?: string;
  max_tokens?: number;
  stop?: string | string[];
  temperature?: number;
}

export interface CompletionsResponse {
  id: string;
  object: "text_completion";
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
  system_fingerprint?: string;
}

export interface Choice {
  index: number;
  text: string;
  logprobs: null;
  finish_reason: "stop" | "length";
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}
```

Called as

```
llama.v1.completions(
  request: CompletionsRequest,
  options?: { signal?: AbortSignal },
): Promise<CompletionsResponse>
```

### Request fields

- `prompt` is the input to generate from; accepts a single string, an array of
  strings (batch), an array of token IDs, or an array of token ID arrays (batch
  over token sequences)
- `model` is the model identifier; when omitted, llama-server uses its loaded
  model
- `max_tokens` is the upper bound on tokens generated
- `stop` is a single string or array of strings; generation halts when any is
  produced
- `temperature` is the sampling temperature

Omitted optional fields use llama-server defaults.

### Response fields

- `id` is the request identifier assigned by the server
- `object` is the discriminator (always `"text_completion"`)
- `created` is the Unix-seconds timestamp
- `model` is the model that generated the response
- `choices` is the list of generated completions
- `usage` is the token counts for the request
- `system_fingerprint` is the server build identifier (optional)

Each `Choice` has:

- an `index` (position in the choices array)
- a `text` (the generated text)
- a `logprobs` field, always `null` in the current scope (request-side
  `logprobs` not yet supported)
- a `finish_reason` (`"stop"` when generation halted at a stop sequence or end
  of output, `"length"` when it halted at `max_tokens`)

Each `Usage` has:

- a `prompt_tokens` count (tokens in the input prompt)
- a `completion_tokens` count (tokens in the generated text)
- a `total_tokens` count (sum of the two)

## Request

`POST /v1/completions` with `CompletionsRequest` as the JSON-serialized body.
Optional fields are omitted from the body when not provided.

## Response

Parsed JSON as `CompletionsResponse`. Errors handled per
`specs/core/request.md`.
