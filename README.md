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

- Copy `.env.omjapp.example` to `.env.omjapp` and adjust non-secret values as needed.
- Build and start the container with `docker compose -f docker-compose.omjapp.yml up -d` (the default file mirrors prod wiring).
- The container exposes port `4000` internally; behind a reverse proxy set `VIRTUAL_HOST`, `LETSENCRYPT_HOST`, and `VIRTUAL_PORT` per the compose file.
- Health checks hit `/health` (GET and HEAD) and should respond with HTTP 200 JSON.

## Env & secrets

- `.env.omjapp.example` documents the required environment variables; it intentionally omits secrets.
- SMTP credentials are sourced from the `omj_sendgrid_api_key` Docker secret and mounted at runtime (see `docker-compose*.yml`).
- Contact routing uses the `CONTACT_TO` and `CONTACT_FROM` values; override them in `.env.omjapp` without committing secrets.
