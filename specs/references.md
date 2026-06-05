# References

External documentation that specs in this repository may cite.

- **[llama-server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)**\
  HTTP API documentation for the server this module wraps.

- **[OpenAI API](https://developers.openai.com/api/reference/overview)**\
  Base shapes for the OpenAI-compatible `/v1` endpoints (chat completions,
  completions, models). llama-server extends these with extra sampling
  parameters (e.g. `top_k`, `min_p`, `repeat_penalty`); those extensions are
  documented in the llama-server reference above, not here.
