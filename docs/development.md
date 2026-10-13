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
