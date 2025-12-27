# Testing

## Unit tests (core)
- dot product correctness
- normalization
- scoring function behavior
- ranking stability (tie-breaker by updatedAt/id)
- domain rules filtering

## Integration tests
- IndexedDB CRUD + migration
- content script insertion into:
  - input
  - textarea
  - contenteditable

## Manual QA checklist
- Hotkey opens palette reliably
- Search responsive
- Insert/copy actions correct
- Variables UI works
- No insertion in password fields
