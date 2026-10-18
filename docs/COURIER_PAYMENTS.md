# Courier + Payment webhooks

## Couriers

Providers: Pathao, Steadfast, Redx, Paperfly, Manual (in-app).

### Per-business keys
Shop/Admin → Online shop / Courier settings → save API key + secret.  
Secrets are masked on GET.

### Status webhooks (register in courier panel)
```
GET /api/couriers/webhook-info   # auth — lists URLs for this business

POST /api/couriers/webhook/steadfast/:businessId
POST /api/couriers/webhook/pathao/:businessId
POST /api/couriers/webhook/redx/:businessId
POST /api/couriers/webhook/paperfly/:businessId
```
Optional header: `x-webhook-secret`

### In-app status
```
POST /api/couriers/delivery-status
POST /api/couriers/ship   # create consignment
GET  /api/couriers/providers
```

### Live checklist
1. Save provider credentials for the business  
2. Create test order → Ship via API  
3. Register webhook URL in Pathao/Steadfast dashboard  
4. Confirm order `deliveryTimeline` updates  

---

## Payments

### Stripe
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...   # required when NODE_ENV=production
```

```
POST /api/payments/webhook/stripe   # raw body — signature verified
GET  /api/payments/webhook-info     # auth — URLs + configured flags
```

Production: missing `STRIPE_WEBHOOK_SECRET` → webhook **rejected**.

### bKash
```
POST /api/payments/webhook/bkash
BKASH_* env vars — see .env.example
```

### Live checklist
1. Stripe Dashboard → Webhooks → endpoint `https://api.../api/payments/webhook/stripe`  
2. Events: `payment_intent.succeeded`, `checkout.session.completed`, `invoice.paid`, failures  
3. `GET /api/payments/webhook-info` → `stripeWebhookSecretConfigured: true`  
4. Test payment → intent status `succeeded` in Firestore  

---

## Employee RBAC quick check
```bash
# Login as cashier PIN → call:
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/staff
# Expect 403 if cashier lacks hr.manage
```
