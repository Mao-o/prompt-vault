# Variables Spec (v0.1)

## Supported syntax
- Required:
  - `{{name}}`
- With default:
  - `{{name=John}}`

## Not supported (v0.1)
- Nested paths: `{{user.name}}`
- Conditionals/loops
- Escaping with backslash
- Type annotations

## Parsing rules
- Variable name: `[a-zA-Z_][a-zA-Z0-9_]*`
- Default value: any chars except `}}` (trim not applied)
- Unknown variables:
  - If no default -> prompt user in UI
  - If default -> use default

## Storage policy
- Variable last-used values:
  - OFF by default
  - If enabled, store per-variable value locally (IndexedDB/settings)
  - Do NOT sync by default
