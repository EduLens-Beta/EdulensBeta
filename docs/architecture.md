# Initial Architecture Decisions

## Deployment shape

Start with one Next.js frontend, one modular FastAPI backend, and PostgreSQL.
Do not introduce microservices, Kubernetes, Redis, or Celery without a
demonstrated requirement.

## Ownership

The backend owns authorization, student-state updates, eligibility rules,
journey transitions, and recommendation ranking.

PostgreSQL is the authoritative persistent store.

FastAPI's OpenAPI schema defines the API contract. Frontend API types should
be generated from this contract when API integration is established.

## Student state

Store student-provided facts, verified evidence, task completion, readiness
evaluations, eligibility decisions, and recommendations separately.

Missing information must remain distinguishable from an unmet requirement.
Task completion alone does not establish verified skill evidence.

## MVP boundary

Start with one Data Analyst pathway, progressive onboarding, profile
management, skills and evidence, journeys, Next Task, readiness explanations,
curated genuine opportunities, deterministic eligibility, opportunity
tracking, contextual AI assistance, and validation analytics.

Additional careers, universities, scholarships, and advanced recommendation
models belong to later expansion.

## Foundation acceptance criteria

- Frontend and backend start locally using documented commands.
- Backend exposes separate liveness and database-readiness checks.
- Backend can connect to PostgreSQL.
- Frontend displays a real backend response.
- Unavailable services produce a clear error state.
- No credentials are committed.
- Initial automated checks pass.

## Decisions still to finalize

- Supported runtime versions and dependency management.
- Local PostgreSQL setup.
- Authentication and session design before authentication implementation.
- Detailed journey and eligibility contracts before their implementation.
- Analytics cohorts, windows, numerators, and denominators before instrumentation.
