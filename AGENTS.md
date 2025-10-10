# AGENTS – Operating Rules

## Mission
Build the Dubai/UAE real estate platform defined in `RealEstate_AI_PRD_Comprehensive.docx`, covering web, API, ML, and infra slices with compliance-first automation.

## Compliance Gates
- Call `POST /permits/check`, persist metadata, and surface the Trakheesi number before publishing any listing.
- Enforce TDRA messaging windows (07:00–21:00 GST) and require WhatsApp opt-in + registered templates.
- Honor PDPL consent and DSR requirements using the immutable consent ledger before any read/write.

## SLOs
- API p95 latency < 300 ms and availability ≥ 99.95%.
- Frontend TTI < 2.5 s on mid-range 4G Android devices.

## Definition of Done
- `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and `pnpm typecheck` all green.
- Unit and e2e coverage for new endpoints with audit logs capturing Trakheesi + consent logic and code links.

## Commit Rules
- Keep commits atomic and reversible, referencing touched lines or docs in messages.

## Context Protocol
- After each numbered task run `pnpm tsx tools/update-context.ts` to append the summary, validation, commit SHAs, and links to `tools/context-log.json`.
