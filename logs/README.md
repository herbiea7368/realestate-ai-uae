# Context Logging

Structured context logs are appended to `context-log.ndjson` to maintain an audit trail of architectural decisions, assumptions, and compliance validations. The log format is newline-delimited JSON with the following fields:

- `timestamp` (ISO 8601, Gulf Standard Time)
- `actor` (`codex`, `operator`, or service name)
- `scope` (`permit-service`, `listing-writer`, `web`, etc.)
- `event` (short action keyword)
- `summary` (one-line description)
- `details` (optional object for structured metadata)

Automation should rotate logs when they exceed 5 MB, following the policy defined in `configs/mcp-servers.json`.
