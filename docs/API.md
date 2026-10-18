# Bizora HTTP API (shop scope)

Base URL: `http://localhost:3000` (or your deploy URL)

## Auth

Most shop routes need:

```http
Authorization: Bearer <accessToken>
```

Login: `POST /api/auth/login` `{ "identifier", "password" }`  
Refresh: `POST /api/auth/refresh` `{ "refreshToken" }`  
Employee: `POST /api/auth/employee-login` `{ "identifier", "pin", "businessId?" }`

## Core resources

| Method | Path | Notes |
|--------|------|--------|
| GET/POST | `/api/products` | Inventory |
| PATCH | `/api/products/:id` | `stockDelta`, `variantStockDeltas` |
| GET/POST | `/api/transactions` | Ledger / POS (idempotent by client `id`) |
| GET/POST | `/api/entities` | Customers / suppliers |
| GET/POST | `/api/staff` | HR staff |
| GET/POST | `/api/journal-entries` | Journal |
| GET/POST | `/api/leave-requests` | Leave |
| GET/POST | `/api/payroll-runs` | Payroll |
| POST | `/api/payments/intents` | Online payment |
| GET/PUT | `/api/webhooks` | Outbound webhooks |
| POST | `/api/webhooks/test` | Test delivery |
| GET/PUT | `/api/business-settings` | Settings |

## Outbound webhooks

```json
{
  "webhooks": [
    {
      "id": "wh1",
      "url": "https://example.com/hooks/bizora",
      "secret": "optional-hmac-secret",
      "events": ["sale.created", "product.low_stock"],
      "active": true
    }
  ]
}
```

Events: `sale.created`, `transaction.created`, `product.low_stock`, `product.updated`, `*`.

Headers: `X-Bizora-Event`, `X-Bizora-Delivery`, `X-Bizora-Signature` (HMAC-SHA256 of body).
