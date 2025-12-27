# Data Model (IndexedDB)

## DB: prompt_vault_db (versioned)

### Store: prompts
Key: id (string, uuid)
Fields:
- id: string
- title: string
- body: string
- tags: string[]
- pinned: boolean
- domainRules: { include?: string[], exclude?: string[] }  // optional
- createdAt: number (ms)
- updatedAt: number (ms)

Indexes:
- updatedAt
- pinned
- title (optional)
- tags (multiEntry optional)

### Store: embeddings
Key: id (same as prompt id)
Fields:
- id: string
- dim: number
- model: string (embedding model identifier)
- normalized: boolean
- vector: ArrayBuffer (Float32Array)

### Store: usage
Key: auto increment
Fields:
- promptId: string
- usedAt: number
- action: "insert" | "copy"
Indexes:
- promptId
- usedAt

### Store: settings
Key: key (string)
Fields:
- key: string
- value: any (JSON)

## Migration rules
- DB version bump with migrate.ts
- embeddings store invalidated when model changes
- Safe fallback: keyword-only search if embeddings absent
