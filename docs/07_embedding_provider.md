# Embedding Provider Interface

## Goals
- Swap provider without touching search/ranking core
- Allow "no embedding" mode
- Allow remote provider opt-in

## Interface
- init(settings): Promise<void>
- embed(text: string): Promise<Float32Array>
- info(): { model: string, dim: number }

## Providers
1) none:
- embed throws or returns null; system falls back to keyword search

2) remote (opt-in):
- User provides endpoint + key in settings
- Only send text to provider if enabled
- Cache embeddings per prompt and per query (short-lived)

3) local (future):
- Load model in offscreen
- Use WebGPU if available, fallback to WASM
