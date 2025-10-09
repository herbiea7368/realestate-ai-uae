# ADR-0001: Platform Architecture Baseline

## Status
Accepted

## Context
The RealEstate AI UAE platform must comply with the product requirements defined in `RealEstate_AI_PRD_Comprehensive.docx`, focusing on the Dubai/UAE market. Key drivers:
- Enforce RERA/DLD Trakheesi permit validation before publishing listings.
- Honor TDRA messaging windows (07:00–21:00 GST) and consent prerequisites.
- Maintain PDPL-compliant consent ledger with UAE data residency (AWS me-central-1).
- Deliver bilingual (English/Arabic) experiences with RTL mirroring.
- Hit non-functional targets: API p95 <300ms, Search p95 <800ms, TTI <2.5s, availability 99.95%.

## Decision
Adopt a modular architecture with separate workspaces:
- Next.js 14 web app (`apps/web`) with Tailwind, shadcn/ui, next-intl, rtlcss, and Mapbox GL for bilingual UX.
- NestJS compliance API (`services/api`) exposing REST endpoints for permits, listing writer, auth, and health, with future GraphQL expansion.
- FastAPI ML bridge (`services/ml-bridge`) to orchestrate AVM/NLP inference services.
- Shared packages (`packages/ui`, `packages/config`) to centralize design system and tooling.
- Terraform templates (`infra/terraform`) to provision AWS me-central-1 workloads.

Observability, security, and compliance guardrails are built into every layer: OpenTelemetry, structured logging, feature flags, and an audit context log.

## Consequences
- Teams can ship vertical slices independently (web, API, ML bridge) while sharing contracts and UI tokens.
- Compliance-critical logic (permit validation, consent checks) has a single source of truth in `services/api`.
- Requires pnpm workspace governance to keep dependency versions aligned.
- Infrastructure automation must integrate with AWS KMS, QLDB consent ledger, and TDRA/RERA integrations per PRD.

