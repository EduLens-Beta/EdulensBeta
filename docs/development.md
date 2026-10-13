# Local Development

## Current status

The Next.js starter is working. FastAPI and PostgreSQL setup are pending.
The frontend does not communicate with a backend yet.

## Frontend environment

Initial setup was verified on Windows using Git Bash:

- Node.js: 22.14.0
- npm: 10.9.2
- Next.js: 16.4.0
- React and React DOM: 19.3.0
- TypeScript strict mode: enabled

Dependencies are recorded in apps/web/package-lock.json.

## Install frontend dependencies

From the repository root:

    cd apps/web
    npm ci

## Run the frontend

From apps/web:

    npm run dev

Open the Local URL printed by the terminal.
Keep the terminal running. Ctrl+C stops the server.

## Frontend checks

From apps/web:

    npm run lint
    npx tsc --noEmit
    npm run build
    npm audit
    npm audit --omit=dev

## Verified checkpoint: 2026-10-13

- Starter page loaded at localhost:3000.
- ESLint completed with exit code 0.
- Production build completed, including its TypeScript check.
- tsconfig.json has strict: true.
- Production dependency audit reported zero vulnerabilities.

The separate tsc command's result has not been recorded.

## Unresolved development dependency advisory

The full audit reported five high-severity findings along this dependency chain:

eslint-config-next -> @next/eslint-plugin-next -> fast-glob -> micromatch -> braces

Installed braces version: 3.0.3.
Advisory: GHSA-vfj7-8cjw-p6xm.
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm

At the time of review, the advisory listed no patched version.
This finding remains unresolved. No forced downgrade was applied.

Keep lint patterns controlled by project configuration. Recheck the advisory
when updating dependencies and before production release.

## Backend setup

The initial backend was tested on Windows with Python 3.14.4 and Git Bash.

From the repository root, create the environment on a fresh checkout:

    py -3.14 -m venv apps/api/.venv

Activate it and install the recorded dependencies:

    source apps/api/.venv/Scripts/activate
    cd apps/api
    python -m pip install -r requirements.txt
    python -m pip check

requirements.txt records the initial development environment, including
runtime packages, testing packages, and their installed dependencies.

## Backend tests

From apps/api with the environment activated:

    python -m pytest -q

## Run the backend

From apps/api with the environment activated:

    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Keep the terminal running. Ctrl+C stops the server.

- Liveness: http://127.0.0.1:8000/health/live
- API documentation: http://127.0.0.1:8000/docs

The liveness endpoint reports whether the API responds.
Database readiness is not implemented yet.

## Backend checkpoint: 2026-10-13

The developer confirmed:
- The health endpoint test passed.
- The running health endpoint returned the expected response.
- Interactive API documentation opened.

Frontend-to-backend integration and PostgreSQL setup remain pending.

## PostgreSQL setup

Keep Docker Desktop running.

From the repository root, create a local .env using the variable names in
.env.example. Set a generated local POSTGRES_PASSWORD before starting the
database. Never commit .env.

Validate and start PostgreSQL:

    docker compose config --quiet
    docker compose up -d db
    docker compose ps

Wait for the db service to show healthy.

Test a query:

    docker compose exec db psql -U edulens -d edulens -c "SELECT current_database(), current_user, 1 AS connection_ok;"

The database is available at 127.0.0.1:5432.
PostgreSQL 17 stores its data in the postgres_data named volume.

Stop the database while preserving its volume:

    docker compose stop db

Start it again:

    docker compose up -d db

Do not use docker compose down -v unless intentionally deleting local database
data. Changing POSTGRES_PASSWORD in .env does not change the password of an
already initialized database.

## Backend database configuration

app/config.py loads the repository-root .env by an absolute path.
It validates database settings and stores the password as SecretStr.

app/database.py creates a cached SQLAlchemy engine using Psycopg.
Connections are returned to the pool after each readiness check.

Health endpoints:

- /health/live: API liveness; does not query the database.
- /health/ready: runs SELECT 1 against PostgreSQL.
  Returns HTTP 200 when ready, or HTTP 503 for database connection/query failures.

The readiness endpoint does not return private database error details.

## Database connection checkpoint: 2026-10-13

- PostgreSQL container became healthy.
- A database query returned the expected database, user, and connection value.
- FastAPI returned {"status":"ok","database":"ready"} from /health/ready.
- Three backend tests passed without warnings after installing httpx2.
- pip check reported no broken requirements.

Readiness tests simulate database success and failure.
The running readiness endpoint was checked separately against real PostgreSQL.

Frontend-to-backend integration, schema migrations, and CI remain pending.

## Frontend-to-backend integration

Frontend environment configuration:

    cp -n apps/web/.env.example apps/web/.env.local

API_BASE_URL identifies the FastAPI server.
It is a server-only variable and defaults in the example to:
http://127.0.0.1:8000

Restart Next.js after changing its environment configuration.

The browser requests /api/health from Next.js.
The Next.js route requests /health/ready from FastAPI.
FastAPI queries PostgreSQL and owns the database-readiness decision.

The Next.js route validates the response, disables caching, and applies
an eight-second fetch timeout. Connection or invalid-response errors
return HTTP 502. Database unavailability returns HTTP 503.

The home page displays loading, success, database-unavailable, and error
states. Check again performs a fresh request.

## Run the local application

Keep Docker Desktop running.

Terminal 1, from the repository root:

    docker compose up -d db
    source apps/api/.venv/Scripts/activate
    cd apps/api
    python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Terminal 2, from the repository root:

    cd apps/web
    npm run dev

Open the Local URL printed by Next.js.
Keep both terminals running.

## Frontend integration checkpoint: 2026-10-14

- ESLint passed without warnings.
- Standalone TypeScript checking passed.
- Production build completed successfully.
- /api/health returned the real backend readiness response.
- The home page displayed Connection successful.
- Connection successful returned after restarting FastAPI.

The backend-offline error state and database-unavailable UI state have
not yet been explicitly confirmed.

Cache Components is enabled. The health route uses the default runtime
without an explicit runtime route-segment export.

CI configuration remains pending.
