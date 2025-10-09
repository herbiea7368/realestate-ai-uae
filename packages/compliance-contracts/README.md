# Compliance Contracts

Canonical JSON Schemas for cross-service communication between the permit compliance API, listing writer bridge, and downstream consumers. Schemas are used to generate language-specific DTOs and OpenAPI definitions.

## Schemas
- `permit-check-request.schema.json`
- `permit-status-response.schema.json`
- `listing-writer-request.schema.json`

## Roadmap
- Add JSON Schema → TypeScript/Pydantic generation pipeline.
- Publish versioned packages to internal registry (`@herbiea7368` scope).
- Enforce schema validation in CI via `ajv` (TypeScript) and `pydantic` (Python).
