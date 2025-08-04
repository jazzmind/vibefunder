# CompetitionManager — Data Map & Model Strategy
**Date:** 2025-08-02

## Data classes
- **Inputs/Outputs/PII/Storage/Transfers** defined per product; see acceptance criteria for benchmarks.


## Model & provider strategy
- Default inference: pluggable (OpenAI, Anthropic, Google, local via vLLM/llama.cpp).
- Retrieval: vector DB optional; embeddings provider pluggable.
- Guardrails: prompt redaction (PII), eval harness for leakage & bias; determinizers (instruction+temperature regimes).
- No training on customer data without explicit opt-in; per-tenant isolation.
