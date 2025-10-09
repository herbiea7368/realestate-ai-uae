# Agent Charter & Guardrails

## Mission
Operate a Dubai/UAE real estate platform that automates leasing and sales workflows while guaranteeing PDPL privacy, RERA/DLD Trakheesi compliance, TDRA messaging windows, and bilingual (EN/AR) experiences. All decisions must align with the PRD (`RealEstate_AI_PRD_Comprehensive.docx`).

## Core Principles
- **Compliance-first:** Reject any listing publish, outbound message, or content generation without a validated Trakheesi permit and documented consent.
- **Data residency:** Persist customer and permit data within AWS me-central-1 resources; no data may leave the UAE region.
- **Bilingual parity:** Deliver equivalent functionality and content in English and Arabic; maintain RTL mirroring for Arabic surfaces.
- **Observability:** Emit structured logs, OpenTelemetry spans, and audit events for every compliance decision.
- **Incremental delivery:** Ship thin, testable vertical slices with explicit audit trails and rollback levers.

## Service Level Objectives
- **Permit/Compliance APIs:** p95 latency `< 300 ms`, availability `≥ 99.95%`, error budget 21.6 minutes/month.
- **Search APIs:** p95 latency `< 800 ms`.
- **Frontend Time-to-Interactive:** `< 2.5 s` on 4G mid-range Android.
- **Incident response:** Triage and customer comms within 15 minutes, postmortem within 48 hours.

## Compliance Gates
1. **Permit Validation Gate**
   - Input must include `trakheesi_number`, `property_id`, and `market`.
   - Validate status against DLD (live or cached) before allowing listing publish.
   - Block on expired, suspended, or missing permits; log audit entry.
2. **Messaging Window Gate**
   - TDRA windows enforced: SMS 07:00–21:00 GST, WhatsApp templates only with explicit opt-in.
   - Consent ledger (DynamoDB + QLDB mirror) must contain active consent flag.
3. **Content Safety Gate**
   - Listing writer outputs route through moderation (toxicity, discrimination) before surface.
   - Arabic + English outputs must be semantically equivalent.
4. **Data Subject Request Gate**
   - All data mutations verify PDPL consent ledger state and pending DSRs.

## Operational Rules
- Every automation step emits to `logs/audit-trail.md` (until centralized logging is live).
- Production changes require passing lint, tests, security scans, and compliance checks.
- Secrets stored exclusively in AWS Secrets Manager; never commit sample secrets.
- Feature flags managed through GrowthBook; default to safe/off for experimental flows.

## Agent Roles
- **Compliance Service Agent:** Maintains permit validation, consent enforcement, and audit trail.
- **Listing Intelligence Agent:** Generates bilingual listing copy with compliance hooks to the permit service.
- **Web Experience Agent:** Builds Next.js client optimized for bilingual, high-performance UX.
- **Ops & Observability Agent:** Ensures metrics, logging, SLO monitoring, and incident response readiness.

## Escalation Paths
- Permit or consent anomalies → Compliance Officer (Notify via PagerDuty + Slack #compliance-alerts).
- Messaging provider outage → Marketing Ops lead, follow runbook in `docs/architecture/runbooks.md`.
- Security incidents → CISO hotline, initiate IR plan within 15 minutes.

## Change Management Checklist
- Update architecture docs and backlog entry before merging significant changes.
- Ensure context logs capture rationale, assumptions, and test evidence.
- Capture PRD alignment notes in `docs/context/context-log.md`.
