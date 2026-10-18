# Deploy + HTTPS (Bizora)

Three apps:

| App | Default local | Production host example |
|-----|---------------|-------------------------|
| API | `:3000` / docker `:3001` | `https://api.yourdomain.com` |
| Shop | `:5173` / docker `:8080` | `https://app.yourdomain.com` |
| Admin | `:5174` / docker `:8081` | `https://admin.yourdomain.com` |

---

## Option A — Caddy (easiest auto-HTTPS)

1. Point DNS A records for `app`, `admin`, `api` to your VPS.
2. Install [Caddy](https://caddyserver.com/).
3. Copy `deploy/Caddyfile` and set your domain.
4. Run API (docker or `node dist/server.cjs`) on `127.0.0.1:3001`.
5. Build static sites:

```bash
export VITE_API_URL=https://api.yourdomain.com
npm run build:frontend
npm run build:admin
# serve frontend/dist and admin/dist (Caddy file_server) OR use docker web/admin images
```

6. Start Caddy — it obtains Let’s Encrypt certificates automatically.

**backend/.env (production):**
```bash
NODE_ENV=production
APP_URL=https://app.yourdomain.com
ADMIN_URL=https://admin.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
JWT_SECRET=<from generate-prod-secrets.mjs>
# ... see .env.production.example
```

---

## Option B — Nginx + Certbot

1. Build & place files (or use Docker).
2. Use `deploy/nginx-https.conf` as a starting point.
3. Certbot:

```bash
sudo certbot --nginx -d app.yourdomain.com -d admin.yourdomain.com -d api.yourdomain.com
```

4. Force HTTPS redirects (included in sample).

---

## Option C — Docker Compose (HTTP first, TLS at edge)

```bash
cp backend/.env.production.example backend/.env
# fill secrets, set APP_URL / ADMIN_URL to https://...

# Build with public API URL baked into SPA:
export VITE_API_URL=https://api.yourdomain.com

docker compose --profile full build \
  --build-arg VITE_API_URL=$VITE_API_URL

docker compose --profile full up -d
```

Put **Caddy or Cloudflare** in front for HTTPS (terminate TLS → proxy to `:8080`, `:8081`, `:3001`).

### Cloudflare (quick TLS)
- Proxied orange-cloud DNS  
- SSL mode: **Full (strict)** if origin has cert, or **Full** with self-signed  
- Or Cloudflare Tunnel to avoid opening ports  

---

## SPA notes

- Frontend/Admin are static + `try_files ... /index.html` (already in `nginx.conf`).
- Prefer same-origin `/api` proxy so cookies/CORS stay simple; or set `VITE_API_URL` to `https://api...`.
- Socket.IO: proxy must support WebSocket upgrade (`proxy_set_header Upgrade`, `Connection`).

---

## Post-deploy checks

```bash
curl -sS https://api.yourdomain.com/api/health
API_URL=https://api.yourdomain.com npm run test:api-smoke
```

Manual:
1. Open `https://app.yourdomain.com` — login  
2. Open `https://admin.yourdomain.com` — SaaS login  
3. Browser: no mixed-content (HTTP API from HTTPS page)  
4. `docs/SECURITY_CHECK.md`  

---

## Firewall

```bash
# Allow only SSH + HTTP/HTTPS (or only 443 if tunnel)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
# Do not expose 3001 publicly if Caddy proxies locally
```
