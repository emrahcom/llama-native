/** Information about a loaded model. */
export interface Model {
  id: string;
  created: number;
  object: "model";
  owned_by: string;
}

/** The response from the models list endpoint. */
export interface ModelsResponse {
  data: Model[];
  object: "list";
}
