# IndexedDB Implementation Notes

## Constraints
- Store Float32Array efficiently in ArrayBuffer
- Prefer structured cloning of ArrayBuffer
- Keep vectors normalized at write-time to simplify dot product

## CRUD APIs
- listPrompts()
- upsertPrompt()
- deletePrompt()
- getEmbedding(id)
- putEmbedding(id, vec, model)
- recordUsage(promptId, action)

## Caching
- Keep prompts list cached in offscreen for fast search
- Invalidate cache on mutations via broadcast message
