# SSR Spike Plan

## Goals
- Render the initial HTML for `/`, `/about`, and `/contact` on the server to improve Largest Contentful Paint while keeping the existing PWA/service worker behavior.
- Preserve the current static build pipeline as a fallback until SSR proves stable.
- Ensure observability (health, logs) keeps working once the runtime serves both API endpoints and the Angular Universal handler.

## Proposed Steps
1. **Workspace preparation**
   - Upgrade Angular CLI/tooling to the latest compatible minor, then run `ng add @angular/ssr` to scaffold the Universal server app (`server.ts`, `main.server.ts`, etc.).
   - Keep the existing `server.cjs` for the API during the spike; new Universal output will live in `dist/openmicjoy/server` + `dist/openmicjoy/browser`.
2. **Server composition**
   - Create a thin Express bootstrap (`ssr/server.mjs`) that mounts:
     1. `/api/contact` and `/health` (reuse logic from `server.cjs`).
     2. Static asset middleware pointing at `dist/openmicjoy/browser`.
     3. The Angular Universal handler produced by `@angular/ssr`.
   - Gate SSR behind an env flag (`ENABLE_SSR=true`) so we can fall back to static HTML by disabling the flag without redeploying.
3. **Build artifacts**
   - Extend `package.json` scripts with `build:ssr` (runs `ng build && ng run openmicjoy:server`) and `serve:ssr`.
   - Update CI to archive both `dist/openmicjoy/browser` and `dist/openmicjoy/server` so we can compare outputs during the spike.
4. **Dockerfile changes**
   - Multi-stage build:
     1. `builder` installs deps and runs `npm run build:ssr`.
     2. `runner` copies both browser + server bundles plus `server.cjs` (for API fallbacks) into `/app`.
   - Install only runtime deps (no devDependencies) in the final stage to keep the image slim.
   - Entrypoint becomes `node ssr/server.mjs` with a flag for static fallback (`node server.cjs`) if `ENABLE_SSR` is false.
5. **docker-compose adjustments**
   - Add `ENABLE_SSR=1` (default off during spike).
   - Expose the same port (4000) so nginx-proxy config stays unchanged.
   - Mount a tmpfs (or volume) for Angular cache if rebuild-on-host is required.
6. **nginx-proxy / perimeter**
   - No port change, but add a short `/ssr-health` location block if we want nginx to bypass SSR during outages (optional in phase 1).
   - Keep the new vhost `Content-Security-Policy-Report-Only`; once SSR stabilises we can revisit stricter directives because HTML is no longer 100% static.
7. **Health checks & observability**
   - Extend `/health` payload with an `ssr` check that reports whether `ENABLE_SSR` is on and if the last render succeeded (tracked in memory by the SSR handler).
   - Update Docker `healthcheck` to continue hitting `/health` (already done in this branch) so no further change is needed after SSR ships.
8. **Rollout plan**
   - Deploy the new image with `ENABLE_SSR=0` → app still serves static HTML while we verify the container boot + health path.
   - Flip `ENABLE_SSR=1` for canary traffic (one domain, or limited time window). Monitor nginx logs + CSP reports.
   - If regressions appear, toggle the env flag back to `0` (no redeploy) and file follow-up issues.

## Rollback
1. Set `ENABLE_SSR=0` to immediately revert to the legacy static server without rebuilding the container.
2. If deeper issues occur, redeploy the previous image tag (the CI artifact from this branch) because the Dockerfile change is backward-compatible.
3. Keep the SSR-specific code paths isolated under `ssr/` so reverting is as simple as removing the env flag and deleting that directory in git.
