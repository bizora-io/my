# OTP production (Twilio SMS + Resend email)

Bizora delivers OTP via `backend/src/lib/notify.ts`.

| Channel | Env vars |
|---------|----------|
| SMS | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| Email | `RESEND_API_KEY`, `EMAIL_FROM` |
| Hardening | `OTP_PEPPER`, `OTP_MAX_ATTEMPTS`, `OTP_LOCK_MS`, `OTP_COOLDOWN_MS` |

**Never in production:** `OTP_DEV_ECHO=true`, `OTP_SKIP_COOLDOWN=1`

---

## 1. Twilio SMS

1. Create account → [Twilio Console](https://console.twilio.com/)
2. Get **Account SID** + **Auth Token**
3. Buy/verify a number → `TWILIO_FROM_NUMBER` (E.164, e.g. `+1234567890`)
4. For Bangladesh trial accounts: verify destination numbers in console first

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_FROM_NUMBER=+1...
```

Phone normalization: local `01XXXXXXXXX` → `+8801XXXXXXXXX`.

## 2. Resend email

1. [resend.com](https://resend.com) → API key  
2. Verify domain (production) or use onboarding domain for tests  
3. Set:

```bash
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=Bizora <noreply@yourdomain.com>
```

## 3. Pepper & locks

```bash
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
OTP_PEPPER=<long-random>
OTP_DEV_ECHO=false
OTP_SKIP_COOLDOWN=0
OTP_MAX_ATTEMPTS=5
OTP_LOCK_MS=900000
OTP_COOLDOWN_MS=60000
```

## 4. Verify config (no send)

```bash
node backend/scripts/verify-otp-providers.mjs
```

## 5. Live test (dev or staging)

```bash
# With providers configured:
# Signup / phone-verify on shop app → SMS or email arrives
# Wrong OTP 5 times → locked
# Rapid resend → cooldown
```

## 6. Readiness

SaaS login → `GET /api/admin/readiness`  
- Twilio / Resend should show configured  
- `OTP_DEV_ECHO` must pass (off)

## Dev without Twilio

`NODE_ENV=development` + no Twilio → code logged to **server console** (`[notify:dev]`).  
Optional `OTP_DEV_ECHO=true` returns code in API JSON — **blocked when NODE_ENV=production**.
