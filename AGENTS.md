# Agent Operating Charter

## Mission & Scope
- Deliver the Dubai/UAE real estate platform described in `RealEstate_AI_PRD_Comprehensive.docx`, covering web, API, ML, and infra surfaces.
- Automate listing creation, permit validation, and content workflows while maintaining bilingual parity (English/Arabic) and compliance-by-design.
- Success = production-ready vertical slices that pass automated quality gates, satisfy PRD user journeys, and maintain an auditable compliance trail.

## Market Compliance Rules
- **Trakheesi Validation & Display:** Every listing must call `POST /permits/check` before publish. Persist the permit metadata and surface the Trakheesi number on buyer-facing pages.
- **TDRA Messaging Windows:** Outbound SMS/voice 07:00–21:00 GST only. WhatsApp requires explicit opt-in and registered templates; block sends outside window.
- **PDPL Consent Ledger:** Consent decisions recorded in an immutable ledger (QLDB mirror). Read/write operations must confirm active consent flags and honor data subject requests.

## Definition of Done (per slice)
- All automated checks green: `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and `pnpm typecheck` (service-specific).
- New/updated endpoints covered by unit and integration/e2e tests; fixtures stored under the relevant workspace.
- Context log updated via `pnpm tsx tools/update-context.ts` with task summary, validation, and code links.
- Pull request / commit message references the relevant code lines or docs added/modified.
- Security and compliance checklist run: secrets absent, Trakheesi + consent logic exercised, error handling logged.

## SLOs & Error Budgets
- **API (permits, listing writer):** p95 latency < 300 ms, availability ≥ 99.95% (error budget ≈ 21.6 min/month). Breaches trigger feature freeze until burn rate < 1.0.
- **Search APIs:** p95 latency < 800 ms.
- **Frontend TTI:** < 2.5 s on 4G mid-range Android devices.
- **Incident Response:** 15-minute acknowledgement, postmortem within 48 hours. Two postmortem misses in a quarter trigger process retro.

## Commit Etiquette
- Keep commits small, atomic, and reversible; group by logical task step.
- Reference key code lines or documents in each commit message (e.g., `services/api/src/permits/...#L42`).
- Never mix generated files or unrelated changes; rerun formatters before committing.

## Context Persistence Protocol
- After each numbered task, append to `tools/context-log.json` using `pnpm tsx tools/update-context.ts --task "<task>" ...`.
- Log entries must include ISO timestamp, summary, validation outcome, commit SHAs, and source links.
- Store supporting ADRs or design notes under `docs/ADR-*.md` and reference them in the context log.
- For incidents or exceptions, create sub-logs under `tools/audit/` (future) and reference in the main context log entry.
