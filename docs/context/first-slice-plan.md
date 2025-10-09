# First Incremental Slice Plan

## Goal
Deliver an end-to-end compliance-focused slice that validates Trakheesi permits and produces bilingual listing copy stubs gated by compliance checks.

## Scope
1. **Permit Validation Service (NestJS)**
   - Endpoints: `POST /permits/check`, `GET /permits/status`.
   - In-memory cache seeded with sample Trakheesi data; interfaces ready for DLD integration.
   - Structured audit logs and OpenTelemetry hooks (placeholders for collector integration).
2. **Listing Writer Stub (FastAPI)**
   - Endpoint: `POST /nlp/listing-writer`.
   - Verifies permit validity via compliance gate and returns bilingual draft placeholders plus moderation flags.
3. **Shared Compliance Contracts**
   - JSON schema definitions under `packages/compliance-contracts`.
   - Reusable TypeScript/Python DTOs generated from schema (stubs in this slice).
4. **Context Persistence & Audit Trail**
   - Append actions to `logs/context-log.ndjson`.
   - Maintain human-readable notes in `docs/context/context-log.md`.

## Definition of Done
- Automated tests covering permit validation edge cases and listing writer gating logic.
- API contracts documented via OpenAPI (generated or static).
- README instructions for running both services locally.
- Git commit with context summary; remote push once upstream is configured.
