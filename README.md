# RealEstate AI UAE Platform

Bootstrapped repository for the Dubai/UAE-focused AI real estate platform. This project follows the product requirements defined in `RealEstate_AI_PRD_Comprehensive.docx` and establishes the initial scaffolding for backend, ML bridge, and web clients.

## Structure

- `apps/permit-service` – NestJS-based compliance/permit API service.
- `apps/listing-writer-stub` – FastAPI stub for the listing writer bridge with compliance gates.
- `apps/web` – Placeholder for the Next.js 14 web application shell.
- `configs/` – Shared configuration (MCP servers, project variables, SLO definitions).
- `docs/` – Architecture notes, context persistence, audit trail, and agent guardrails.
- `infra/` – Terraform and platform provisioning placeholders.
- `logs/` – Context logging sink (rotated via future automation).

## Getting Started

```sh
npm install
npm run dev --workspace @realestate-ai-uae/permit-service
```

For the FastAPI stub:

```sh
uvicorn apps.listing-writer-stub.main:app --reload
```

Refer to `docs/context/first-slice-plan.md` for the incremental roadmap and `AGENTS.md` for compliance guardrails and SLO targets.
