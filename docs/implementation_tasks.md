# Implementation Tasks (for Codex)

## T1: MV3 skeleton
- manifest.json
- service worker + command registration
- minimal UI page open on command

## T2: IndexedDB layer
- idb.ts wrapper
- stores: prompts, embeddings, usage, settings
- migrations

## T3: Core search
- normalize vectors
- dot product
- scoring function (semantic + recency + pin)
- searchTopK

## T4: UI command palette
- search box + list + keyboard navigation
- debounce + cancel in-flight
- preview + actions

## T5: Content script insertion
- detect active element
- safe insert/copy
- block password fields

## T6: Embedding provider abstraction
- interface + "none" provider
- stub remote provider (OFF by default)

## T7: Quality
- unit tests for core
- manual QA checklist
