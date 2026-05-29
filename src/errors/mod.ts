export class LlamaError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LlamaError";
  }
}

export class LlamaHTTPError extends LlamaError {
  readonly status: number;
  readonly body?: unknown;

  constructor(
    message: string,
    status: number,
    body?: unknown,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "LlamaHTTPError";
    this.status = status;
    this.body = body;
  }
}

export class LlamaStreamError extends LlamaError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LlamaStreamError";
  }
}
