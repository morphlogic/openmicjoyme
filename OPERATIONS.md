# Operations Runbook – OpenMicJoy on Octohost

## Environment
- OS: Ubuntu 22.04 LTS
- Reverse Proxy: nginx-proxy + acme-companion
- Docker network: `proxy`
- External DNS: openmicjoy.me → Octohost
- App internal port: `4000`

## Secrets
| Name | Type | Host Path | Mounted At |
|------|------|------------|-------------|
| SendGrid API Key | File | `/srv/secrets/omj_sendgrid_api_key` | `/srv/secrets/omj_sendgrid_api_key:ro` |

- `ADMIN_API_KEY` (env) enables the hidden admin API; keep it in `.env.omjapp` or a Docker secret if you prefer.

### Permissions
```bash
sudo chmod 600 /srv/secrets/omj_sendgrid_api_key
sudo chown root:root /srv/secrets/omj_sendgrid_api_key
```

## Health Check
- Internal: `http://127.0.0.1:4000/health`
- External: `https://openmicjoy.me/health`
- Dockerfile/Compose healthcheck:
  ```Dockerfile
  HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:4000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
  ```

## Troubleshooting Loop
1. Check container status:
   ```bash
   docker ps --format 'table {{.Names}}\t{{.Status}}'
   ```
2. Health from inside:
   ```bash
   docker exec -it <container> sh -lc "curl -fsS http://127.0.0.1:4000/health && echo"
   ```
3. Health via domain:
   ```bash
   curl -fsS https://openmicjoy.me/health && echo
   ```
4. Logs:
   ```bash
   docker logs --tail=200 <container>
   ```
5. Only then adjust compose or `server.cjs`.

## Deployment
```bash
git pull origin main
npm ci && npm run build
npm run docker:build
docker compose down && docker compose up -d
```
