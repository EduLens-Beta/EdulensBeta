# EduLens

EduLens is a Student Operating System that helps students assess their
current position, choose goals, and progress through actionable journeys.

## Project status

Foundation setup is in progress. Application services are not implemented yet.

## Architecture

- Frontend: Next.js App Router, React, strict TypeScript.
- Backend: Python and FastAPI, organized as a modular monolith.
- Database: PostgreSQL, SQLAlchemy 2.x, and Alembic.
- Business rules and official state transitions belong in the backend.
- Frontend and backend dependencies are managed separately.

## Repository layout

- apps/web: frontend, to be created.
- apps/api: backend, to be created.
- docs: architecture and development documentation.
- infra: infrastructure configuration.
- .github/workflows: continuous integration.

## Development principles

- Never commit credentials or real student data.
- Verify changes before considering a feature complete.
- Keep student facts, evidence, progress, and derived decisions separate.
- Use deterministic eligibility and journey rules.
- Label development sample data clearly.

See docs/architecture.md for initial decisions and the foundation checkpoint.
