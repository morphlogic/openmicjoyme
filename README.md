# OpenMicJoy

Live schedule for DFW open mics, built with Angular and served via a lightweight Node/Express host.

## Dev

- Install dependencies with `npm install` (or `npm ci` if you prefer a clean install).
- Run `npm run start` to start the dev server on `http://localhost:4200/`; the browser auto-opens with live reload.
- Specs live next to the code; execute `npx ng test --watch` during development for fast feedback.
- Service worker updates are enabled; when testing locally you can toggle deterministic builds with `npx ng config cli.cache.enabled false`.

## Build

- Run `npm run build` (or `npx ng build --configuration production`) to emit production assets into `dist/openmicjoy/`.
- The output bundle is what CI uploads and what the Docker image serves from the `/app/dist` directory.

## Docker run

- Running `docker compose up --build -d` works well.
- Copy `.env.omjapp.example` to `.env.omjapp` and adjust non-secret values as needed.
- `docker-compose*.yml` loads that file via `env_file`, so values such as `ADMIN_API_KEY`, `CONTACT_TO`, etc. become environment variables inside the container without exporting them manually.
- Build and start the container with `docker compose -f docker-compose.omjapp.yml up -d` (the default file mirrors prod wiring).
- The container exposes port `4000` internally; behind a reverse proxy set `VIRTUAL_HOST`, `LETSENCRYPT_HOST`, and `VIRTUAL_PORT` per the compose file.
- Health checks hit `/health` (GET and HEAD) and should respond with HTTP 200 JSON.

## Env & secrets

- `.env.omjapp.example` documents the required environment variables; it intentionally omits secrets.
- SMTP credentials are sourced from the `omj_sendgrid_api_key` Docker secret and mounted at runtime (see `docker-compose*.yml`).
- Contact routing uses the `CONTACT_TO` and `CONTACT_FROM` values; override them in `.env.omjapp` without committing secrets.
- When you run `node server.cjs` (or `npm run serve:node`) locally, the host automatically loads `.env` then `.env.omjapp` if they exist, so you can define `ADMIN_API_KEY`, mail overrides, etc. without exporting them manually.

## Contact & event submissions

- Every POST to `/api/contact` sends an email and then appends sanitized JSON snapshots to `data/contact-submissions.json` (all messages) and, when an actionable event is included, to `data/event-submissions.json`.
- Set `EVENT_STORAGE_DIR=/some/path` to relocate those files (defaults to `<repo>/data`); the server creates the directory if it does not exist.
- Event records include `id`, `submittedAt`, contact info, request type, and the normalized event payload (name, description, cadence, next show date, etc.) so approvers can review without digging through email.
- Download a fresh copy at any time with `docker exec <container> cat /app/data/event-submissions.json` (or the custom path) before curating the schedule.

## Admin workspace

- Five taps/clicks on the OMJ logo (within three seconds) reveal a fourth toolbar icon that links to `/admin`. It is intentionally hidden from the public nav.
- The admin view prompts for the shared passphrase and then calls `GET /api/admin/event-submissions`, sending the passphrase as the `x-omj-admin-key` header.
- Set `ADMIN_API_KEY` in `.env.omjapp` (and in production secrets) to enable the endpoint; when unset, the API returns `503 admin_disabled`.
- The UI stores the passphrase in-memory only; refresh the queue from the page header after triaging events in `data/event-submissions.json`.
