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

## Continuous integration

.github/workflows/ci.yml runs on pushes to main and feat/foundation,
pull requests targeting main, and manual workflow dispatch.

Frontend checks:
- npm ci
- ESLint with zero warnings allowed
- TypeScript checking
- Production build

Backend checks:
- Install recorded dependencies
- pip check
- pytest
- Readiness endpoint against a temporary real PostgreSQL 17 database

CI uses Node.js 22.14.0 and Python 3.14.4 on GitHub-hosted Ubuntu.
Its test database is separate from local development data.

The first CI run must be inspected on GitHub before this checkpoint
is considered verified.

### Type generation before standalone TypeScript checks

On a fresh checkout, run these commands from apps/web:

    npx --no-install next typegen
    npx --no-install tsc --noEmit

Next.js generates LayoutProps and other route helpers.
CI must generate them before running standalone TypeScript checking.

The first CI run passed backend checks but failed frontend TypeScript
checking because this generation step was missing.

## Final foundation verification: 2026-10-14

- GitHub Actions frontend and backend jobs passed.
- Stopping PostgreSQL displayed Database unavailable.
- Restarting PostgreSQL restored Connection successful.
- Stopping FastAPI displayed Connection check failed.
- Restarting FastAPI restored Connection successful.

These manual checks verify failure and recovery through the frontend,
Next.js health route, FastAPI, and PostgreSQL.

### Start FastAPI from the repository root on Windows Git Bash

This command uses the virtual environment directly; activation is not required:

    ./apps/api/.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir apps/api --reload --reload-dir apps/api/app --host 127.0.0.1 --port 8000

Keep the backend terminal running.

The foundation is ready for pull-request review.
The previously recorded development dependency advisory remains unresolved.

## Database migrations

Alembic configuration is in apps/api/alembic.ini.
Migration scripts belong in apps/api/migrations/versions.

From apps/api, inspect the database revision:

    ./.venv/Scripts/python.exe -m alembic current

Migration connections load the existing repository-root .env through
app.config. No database credentials belong in alembic.ini.

Migrations use a separate connection with:
- Five-second connection timeout.
- Sixty-second statement timeout.
- Five-second lock timeout.

SQLAlchemy models share app.models.Base and its constraint naming convention.
Future model modules must be imported so Alembic can discover their metadata.

Checkpoint: 2026-10-26
- Developer confirmed Alembic connected successfully.
- Existing three backend tests passed.
- At this checkpoint, no application tables or migration revisions existed.
  The initial account migration was added afterward.

## Initial account schema

Migration: 07ccc7616ee0, create users and auth sessions.

users stores account identity, normalized unique email, password hash,
active status, verification timestamp, and creation/update timestamps.

auth_sessions stores user ownership, a unique token hash, creation,
expiry, and optional revocation timestamps. User deletion cascades to
their sessions.

This checkpoint introduced the schema only. Authentication behavior was
implemented in subsequent steps documented below.

## PostgreSQL schema tests

A separate local edulens_test database must already exist.

From apps/api, prepare its schema:

    POSTGRES_DB=edulens_test ./.venv/Scripts/python.exe -m alembic upgrade head

Run all tests:

    POSTGRES_DB=edulens_test EDULENS_RUN_DB_TESTS=1 ./.venv/Scripts/python.exe -m pytest -q

Database tests require explicit opt-in and a database name ending in
_test or _ci. Each test rolls back its changes.

Developer confirmed 13 local tests passed on 2026-10-26.

CI now applies, downgrades, and reapplies migrations in its temporary
database, checks for schema drift, and runs the PostgreSQL tests.
The updated CI run must pass before this checkpoint is verified.

## Password hashing

app/security.py provides hash_password and verify_password using argon2-cffi.

Argon2id parameters:
- Memory: 19456 KiB.
- Iterations: 2.
- Parallelism: 1.
- Hash length: 32 bytes.
- Random salt length: 16 bytes, generated by the library.

Passwords preserve whitespace and Unicode characters.
Wrong passwords and malformed stored hashes return False from verification.

Focused tests, from apps/api:

    ./.venv/Scripts/python.exe -m pytest tests/test_security.py -q

Developer confirmed seven password tests passed on 2026-10-26.

This checkpoint introduced password hashing. Signup, login, and session
handling were implemented afterward. Rate limiting remains pending.

## Signup API

POST /auth/signup accepts name, email, and password.

Validation:
- Name: trimmed, 1-120 characters.
- Email: validated, lowercased, maximum 254 characters.
- Password: 15-128 characters; spaces and Unicode preserved.
- Unexpected fields are rejected.

Successful signup returns HTTP 201 with id, name, email, and created_at.
Passwords and password hashes are excluded from responses.

Account creation uses a database transaction.
Duplicate email returns HTTP 409.
Database availability failures return HTTP 503.
Request-validation responses exclude raw input values and error context.

Developer confirmed:
- Twelve signup-schema tests passed.
- Five signup API tests passed against PostgreSQL.
- Password hashing uses the existing tested Argon2id implementation.

Signup creates an account without signing the user in automatically.
Web signup, login, and sessions are documented below. Rate limiting and
email verification remain pending.

## Login and database sessions

POST /auth/login accepts email and password.
Email normalization matches signup; password whitespace and Unicode are preserved.

Successful login returns a session token, its expiry, and public account fields.
Sessions expire 24 hours after login.

Session tokens contain 32 cryptographically random bytes, encoded as URL-safe
text. PostgreSQL stores only the SHA-256 token hash.

Unknown emails, incorrect passwords, and inactive accounts return the same
HTTP 401 message. Unknown emails still perform Argon2 verification against
a dummy hash.

GET /auth/me requires Authorization: Bearer <session-token>.
It returns public account fields only when the session is unexpired,
unrevoked, and belongs to an active user.

POST /auth/logout revokes the supplied session. Repeating logout is safe.
Other sessions belonging to the same user remain active.

## Browser authentication

Pages:
- /signup: create an account.
- /login: sign in.
- /account: check account identity and sign out.

The browser calls Next.js routes under /api/auth.
Next.js forwards requests to FastAPI using the private API_BASE_URL setting.

The login route stores the token in the edulens_session cookie:
- HttpOnly.
- SameSite=Lax.
- Path=/.
- Expiry supplied by the backend.
- Secure in production; local HTTP development is supported.

The token is not returned in the web login response or stored in localStorage.
Account checks and logout read the cookie on the Next.js server and forward
the token to FastAPI in the Authorization header.

Web login and logout require the Origin header to match the request origin.
Authentication route responses use Cache-Control: no-store.

An invalid or expired session returns HTTP 401 from the account-check route.
Temporary backend failures are shown as service errors rather than successful
sign-out or confirmed session expiry.

Logout clears the browser cookie after backend revocation is confirmed.
If revocation cannot be confirmed, the user can retry.

The /account page shell is statically rendered. Private account data is fetched
after loading and is authorized by FastAPI on every account request.

## Authentication verification checkpoint: 2026-10-27

Developer confirmed:
- 64 backend tests passed, including PostgreSQL integration tests.
- Frontend lint passed with zero warnings.
- Next.js route type generation and TypeScript checks passed.
- Production build passed on Next.js 16.4.3.
- Browser login rejected an incorrect password.
- Successful login displayed the account name and email.
- Refresh preserved the signed-in session.
- Logout returned to the login page.
- Opening /account after logout showed the signed-out state.

Next.js and eslint-config-next were upgraded together to 16.4.3.
The installation reported zero npm audit vulnerabilities at that checkpoint.

Browser checks above were manual; they are not automated browser tests.
Rate limiting, email verification, password recovery, and automated browser
authentication tests remain pending.

Authentication response caching:
- FastAPI /auth responses explicitly send Cache-Control: no-store.
- Tests cover successful authentication and rejected requests.
- Developer confirmed 68 backend tests passed on 2026-10-27.

## Student onboarding

Signup remains the same for everyone. After login, /student checks the
authenticated student's saved education stage. Students without a selection
continue to /welcome.

Education stages:
- Class 6–8
- Class 9–10
- College / HSC
- University

Migration d800b2b19fc1 adds student_profiles with one profile per account.
GET /student/profile reads the current student's selection.
PUT /student/profile creates or updates it.
Both endpoints require authentication and send Cache-Control: no-store.

The web route /api/student/profile uses the existing HttpOnly session cookie.
Profile updates require a matching Origin header.
The welcome page saves the selection before continuing to /student.
Students can change their education stage from their student home.

Student home content varies by education stage. Personalised activities
remain in development.

Verification:
- 13 student-profile tests passed.
- Complete backend suite: 81 tests passed.
- Frontend lint, route type generation, TypeScript, and production build passed.
- Developer confirmed the browser onboarding flow worked.
