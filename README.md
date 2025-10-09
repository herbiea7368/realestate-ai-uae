# RealEstate AI UAE Platform

Greenfield implementation for the Dubai/UAE real estate platform described in `RealEstate_AI_PRD_Comprehensive.docx`. The repository is organized as a pnpm monorepo with separate workspaces for web, APIs, ML bridges, shared packages, and infrastructure.

## Repository Layout

- `apps/web` – Next.js 14 (TypeScript) web client with Tailwind, next-intl, rtlcss, shadcn/ui, and Mapbox GL.
- `services/api` – NestJS backend exposing REST/GraphQL modules for compliance (`permits`, `listing-writer`), auth, and health.
- `services/ml-bridge` – FastAPI adapters that bridge to AVM/NLP inference endpoints.
- `packages/ui` – Shared UI components and theme primitives.
- `packages/config` – Centralized linting, formatting, and tsconfig presets.
- `infra/terraform` – AWS me-central-1 baseline infrastructure as code.
- `docs` – PRD extracts, architecture decisions, compliance notes.
- `.github/workflows` – CI pipelines for build, lint, test, e2e smoke runs.
- `tools` – Context logging utilities and operational scripts.

## Prerequisites

- Node.js 20 LTS
- pnpm ≥ 9
- Python 3.11 (for FastAPI services)
- Docker (optional for local infra emulation)

## Getting Started

```sh
pnpm install
pnpm dev:web       # Next.js dev server
pnpm dev:api       # NestJS API (services/api)
pnpm dev:ml        # FastAPI ML bridge
```

### Testing & Quality

```sh
pnpm lint
pnpm test
pnpm test:e2e
```

Refer to `docs/ADR-0001-architecture.md` for the architecture decision log anchored to the PRD and `AGENTS.md` for mission guardrails, SLOs, and compliance requirements.
