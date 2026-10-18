# Bizora — Code status (100% sprint)

Last update: 2026-10-16

## Coded & in tree (~94–96%)

| Area | Status |
|------|--------|
| Auth JWT / OTP / rate limits | Done |
| POS Buy/Sell/QuickSale (lazy) | Done |
| Inventory / FEFO / lots | Done |
| Customers / suppliers / staff RBAC API | Done |
| Journal / ledgers / consolidation | Done |
| Payroll void + reversal | Done |
| Online shop + storefront + order live | Done |
| Courier ship + webhooks | Done |
| Payments Stripe/bKash webhooks | Done |
| SaaS admin tabs (lazy) + plans + tickets | Done |
| Impersonation banner + TTL | Done |
| Backup conflict + cloud | Done |
| Readiness + GO_LIVE docs | Done |

## Not “code” — your environment (required for 100% live)

1. Production `.env` secrets  
2. Firebase project + rules  
3. Twilio / Resend  
4. HTTPS deploy  
5. Manual smoke (`SMOKE_TEST.md`)  
6. `SECURITY_CHECK.md` sign-off  

```bash
npm run report:readiness
npm run test:api-smoke
npm run verify:otp
```

## Optional polish (P3)

- Announcement targeting by region  
- Audit retention UI  
- CI pipeline on GitHub  
- Further AdminPanel shell shrink  

These do **not** block go-live of core ERP + SaaS.
