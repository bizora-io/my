# Bizora — screen flows (shop app)

## Daily retail loop
1. **Buy** (`/purchase`) — receive goods, set **lot / expiry / serials (SN)**
2. **Sell** (`/sale`) — POS, FEFO lots, store credit, payment split
3. **Stock Report** (`/stock`) — lots, serials tab, stock take
4. **Sales Return** (`/sales-return`) — partial return, restock, serial restore
5. **Journal** (`/journal`) — auto-posts from ledger; TB / GL / P&L / BS

## Money
- **Accounts & Cash** — bank recon, journal from unmatched lines
- **Ledgers** — Sale / Purchase / Due / Expense
- **Customers** — wallet (store credit), statements
- **Reports → Tax & VAT** (`/reports?tab=tax`) — output/input VAT, CSV, print; set **Settings → tax rate** first

## Online
- **Online Shop** — templates, orders into app
- **Couriers** — book + track (via shop / order screens)

## SaaS admin
- Businesses → expiry + **Enforce lock**
- Analytics → churn refresh / at-risk CSV → click row to edit

## Tips
- App uses **HashRouter**: links are `#/path` (not bare `/path`).
- Period lock on Journal blocks back-dated posts.
- Subscription enforce blocks shop when expired (renew at `#/subscription`).
