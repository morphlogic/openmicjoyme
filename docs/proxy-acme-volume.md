# Proxy Stack — acme-companion Persistent Volume Patch

The nginx-proxy stack under `/srv/proxy/docker-compose.yml` currently stores issued certificates inside the shared `certs` volume, but the acme-companion account data (`/etc/acme.sh`) lives on the ephemeral container filesystem. The following patch introduces a dedicated named volume so registration data and issued cert metadata persist across container recreations.

```diff
diff --git a/docker-compose.yml b/docker-compose.yml
index 7aafc12..c4f9e4d 100644
--- a/docker-compose.yml
+++ b/docker-compose.yml
@@
 volumes:
   confd:
   vhostd:
   html:
   certs:
+  acme-data:
@@
   acme-companion:
@@
     volumes:
       - certs:/etc/nginx/certs
       - vhostd:/etc/nginx/vhost.d
       - html:/usr/share/nginx/html
       - /var/run/docker.sock:/var/run/docker.sock:ro
+      - acme-data:/etc/acme.sh
```

After applying the patch, run `docker compose up -d acme-companion` inside `/srv/proxy` to recreate the companion with the new volume. Existing certificates remain untouched because they live inside `certs:/etc/nginx/certs`.
