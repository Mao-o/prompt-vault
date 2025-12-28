# Error Handling & Degradation

## Principles
- Fail soft: semantic search -> keyword search fallback
- Provide actionable UI feedback
- Keep user data safe; never lose prompts on transient errors

## Error cases & responses

### 1) IndexedDB open failure
- Show blocking banner: "Storage unavailable"
- Disable edits, allow copy of visible cache if exists
- Error code: IDB_OPEN_FAILED

### 2) Quota exceeded
- Offer "Export" and "Delete old usage history" actions
- Stop writing usage events first (lowest priority)
- Error code: IDB_QUOTA_EXCEEDED

### 3) Offscreen create failure
- Fallback: compute in content script Worker (limited) OR keyword-only search
- Error code: OFFSCREEN_CREATE_FAILED / OFFSCREEN_UNAVAILABLE

### 4) Embedding timeout/provider error
- Fallback: keyword search immediately
- Show non-blocking toast
- Error code: EMBEDDING_TIMEOUT / EMBEDDING_PROVIDER_ERROR

### 5) Content insertion failure
- Fallback: copy to clipboard
- Error code: CONTENT_INSERT_FAILED / NO_ACTIVE_EDITABLE

## UX messaging guidelines
- One-line cause + one-line action
- Provide "Retry" for recoverable errors
