# Tasks

## T-001: Client implementation

Per `specs/client.md`.

status: done

- Added `src/client/mod.ts` with the `Llama` class and `ClientOptions`
  interface. Defaults `baseUrl` to `http://localhost:8080`, strips trailing
  slashes, leaves `apiKey` undefined when not provided, and freezes `config` so
  it cannot mutate after construction.
- Added `src/mod.ts` re-exporting `Llama` and `ClientOptions` as the module's
  public surface.
