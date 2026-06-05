# /v1/models

Lists the models available on the llama-server.

## Location

`src/v1/`

## TypeScript surface

```ts
export interface V1ModelsResponse {
  object: "list";
  data: V1Model[];
}

export interface V1Model {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
}
```

Called as

```
llama.v1.models(
  options?: { signal?: AbortSignal },
): Promise<V1ModelsResponse>
```

`data` is the list of available models. Each `V1Model` has:

- an `id` (the model identifier)
- an `object` discriminator (always `"model"`)
- a `created` timestamp (Unix seconds)
- an `owned_by` string (the model owner; llama-server reports `"llamacpp"`)

This endpoint introduces the `V1` sub-group to `Llama`, accessed as `llama.v1`.
Future `/v1/*` endpoints add methods to the same sub-group.

## Request

`GET /v1/models` with no body.

## Response

Parsed JSON as `V1ModelsResponse`. Errors handled per `specs/core/request.md`.
