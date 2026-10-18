# Bizora — Go-live checklist

## 1. Secrets
```bash
node backend/scripts/generate-prod-secrets.mjs
cp backend/.env.production.example backend/.env
# fill JWT, OTP_PEPPER, Firebase, APP_URL, ADMIN_URL, Twilio/Resend
```

## 2. Build
```bash
npm install
npm run build
```

## 3. Deploy
- API: `node backend/dist/server.cjs` or Docker  
- Static: `frontend/dist`, `admin/dist`  
- TLS: `docs/DEPLOY_HTTPS.md`

## 4. Verify
```bash
curl -sS https://api.yourdomain.com/api/health

# Full readiness markdown:
API_URL=https://api.yourdomain.com \
SMOKE_SAAS_ID=owner@... SMOKE_SAAS_PASSWORD=... \
node backend/scripts/prod-readiness-report.mjs
```

Admin UI → **Readiness** tab → Download JSON.

## 5. Smoke
`docs/SMOKE_TEST.md` + `npm run test:api-smoke`

## 6. Security sign-off
`docs/SECURITY_CHECK.md` — every row PASS/N/A + date.

## Definition of live
- [ ] `readyForProd: true` (or requiredFails=0 in staging)
- [ ] Real OTP SMS/email on signup
- [ ] Shop buy→sell works
- [ ] Admin businesses + plan request
- [ ] HTTPS, no mixed content
