# Security & Privacy

## Defaults
- All data stored locally (IndexedDB)
- No network calls unless remote embedding provider explicitly enabled
- No telemetry by default

## Insertion safety
- Never insert into password fields
- Respect domain denylist
- Sanitize content for HTML insertion (contenteditable) to plain text unless user chooses rich mode

## Secrets
- If remote provider keys exist, store using chrome.storage (sync/local) with clear warnings
- Provide "clear secrets" button

## Permissions minimization
- Use activeTab where possible
- Avoid broad host_permissions unless necessary for injection UX
