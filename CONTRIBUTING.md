# Contributing – OpenMicJoy

## Core Principles
- **Ask before assuming.**
  If you don’t know a value (port, path, network, secret name, etc.), ask.
- **Single source of truth.**
  - One compose file: `docker-compose.yml`
  - Port: `4000`
  - Proxy network: `proxy`
  - Secret: `/srv/secrets/omj_sendgrid_api_key`
- **Minimal viable change first.**
  Fix what’s broken before adding new tools or frameworks.

## Local Workflow
```bash
nvm use
npm ci
npm run build
docker compose up -d
curl -fsS http://127.0.0.1:4000/health && echo
```

## Health & Contact
- `GET/HEAD /health` → `{ ok: true }`
- `POST /api/contact` → SendGrid via `SMTP_PASS_FILE=/srv/secrets/omj_sendgrid_api_key`

## Commit Style
One intent per commit:
```bash
git commit -m "chore(omj): unify compose on proxy net and wire SendGrid via /srv/secrets"
```

## Pull Requests
- [ ] `npm run build` passes
- [ ] Container health OK
- [ ] `/api/contact` verified
- [ ] No duplicate compose files
- [ ] Port 4000, network proxy, secret path unchanged
