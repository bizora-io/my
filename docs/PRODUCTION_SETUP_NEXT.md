# Production setup — next steps

## 1. Generate secrets
```bash
node backend/scripts/generate-prod-secrets.mjs
node backend/scripts/generate-password-hash.mjs "YourStrongSaaSPassword"
```

## 2. Env files
```bash
cp backend/.env.production.example backend/.env
# fill JWT_SECRET, OTP_PEPPER, SAAS_OWNER_*, Firebase, APP_URL, ADMIN_URL

cp frontend/.env.production.example frontend/.env.production
cp admin/.env.production.example admin/.env.production
# set VITE_API_URL=https://api.yourdomain.com
```

## 3. Local production-mode smoke
```bash
# backend/.env → NODE_ENV=production temporarily only if secrets are real
npm run build
NODE_ENV=production npm run start -w backend   # if start script exists
```

## 4. Security checklist
Open `docs/SECURITY_CHECK.md` and mark every row PASS.

## 5. Readiness API
Login as SaaS → `GET /api/admin/readiness` with Bearer token.  
All critical checks should be green.

## 6. Functional smoke (`docs/SMOKE_TEST.md`)
Register shop → add product → sale → Admin sees business → plan request → approve.
