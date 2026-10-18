# Bizora — Monorepo

Bizora restructured into 4 independently buildable/deployable workspaces:

```
bizora-monorepo/
├── backend/    Express API (Bizora ERP Assistant, auth, REST endpoints)
├── frontend/   Main business app — POS, inventory, accounting, CRM, HR, etc.
├── admin/      Standalone SaaS Admin app (only SaaS Owner/Admin can sign in)
└── shared/     Contexts, types, utils, and a few cross-app components used
                by both frontend and admin (single source of truth)
```

## Quick start

```bash
npm install          # installs all 4 workspaces at once (npm workspaces)

# in separate terminals:
npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:5173
npm run dev:admin      # http://localhost:5174
```

Copy `.env.example` → `.env` in `backend/`, `frontend/`, and `admin/` and fill
in the values before running.

**New here?** See [`SETUP.md`](./SETUP.md) for a full step-by-step walkthrough
(Firebase setup, generating the SaaS Owner password hash, first login,
troubleshooting).

**Wondering what's real vs. mocked?** See
[`BLUEPRINT_CROSSCHECK.md`](./BLUEPRINT_CROSSCHECK.md) for a full,
section-by-section comparison against a complete enterprise ERP feature
list — what's backend-real, what's UI-only, and what's not built at all.

## What changed from the original single-app project

1. **Admin is now a fully separate app** (`/admin`), with its own
   `index.html`, `main.tsx`, build, and login gate — it only renders
   `AdminPanel` and only lets `SaaS Owner` / `SaaS Admin` accounts in. The
   main app no longer bundles `AdminPanel`; any in-app link that used to go
   to `/admin` now does a real browser redirect to the admin app's URL
   (`VITE_ADMIN_URL`).
2. **`server.ts` is a pure API now** — it no longer serves the frontend via
   Vite middleware / `express.static`. `frontend` and `admin` are separate
   Vite projects that call it over HTTP (`VITE_API_URL`), with CORS locked
   down to `APP_URL` / `ADMIN_URL` in production.
3. **`mongodb`/`mongoose` removed** — they were an unused/incomplete
   dependency (`src/api/users.ts` never actually queried them). The users
   route now reads/writes Firestore via `firebase-admin` on the backend.
4. **Shared code lives in `/shared`**, and both apps have thin "shim" files
   at the same paths the original code used (e.g.
   `frontend/src/contexts/AuthContext.tsx` just re-exports
   `@shared/contexts/AuthContext`) — so none of the 35+ existing component
   files needed their imports rewritten. Edit the real logic in `/shared`;
   it's picked up by both apps automatically.

## ⚠️ Important: this app currently has no real backend database

Every business-data context (`DataContext`, `AuthContext` — products, sales,
customers, staff, even login/registration) currently persists to the
**browser's `localStorage`**, not to a server or Firestore. Firebase is
configured (`shared/lib/firebase.ts`) but not actually wired up to read/write
data yet. In practice this means:
- Data doesn't sync across devices/browsers.
- There's no real multi-user backend today, despite this being an ERP/SaaS
  product.

This wasn't something that could be fixed as part of the restructuring — it's
a genuine backend build-out. The plan (as agreed):

- [x] **Stage 1 — done:** split into `backend` / `frontend` / `admin` /
      `shared`, remove mongodb, admin app runs standalone.
- [x] **Stage 2a — done:** real backend auth for the **Shop Owner** signup/
      login flow — `POST /api/auth/register`, `POST /api/auth/login`,
      `GET /api/auth/me` (`backend/src/api/auth.ts`), Firestore-backed via
      `firebase-admin`, bcrypt-hashed passwords, JWT session token stored as
      `bizora_token`. `AuthContext`'s `signup()`/`login()` call this first;
      other login paths (SaaS owner/admin, employee, staff, legacy admin)
      still fall back to their old `localStorage` checks — not yet migrated.
- [x] **Stage 2b — done:** real Products backend — `GET/POST/PATCH
      /api/products` (`backend/src/api/products.ts`), Firestore path
      `businesses/{businessId}/products/{productId}` (businessId = the Shop
      Owner's own account id for now — no multi-business support on the
      backend yet). `DataContext`'s `addProduct`/`updateProduct` sync to it
      when a Shop Owner session token is present; product list refreshes
      from the backend on load. Falls back to `localStorage`-only for other
      login types or if the backend is unreachable.
- [x] **Stage 2c — done:** real Transactions backend — `GET/POST/PATCH
      /api/transactions` (`backend/src/api/transactions.ts`), Firestore path
      `businesses/{businessId}/transactions/{id}`. This one collection
      covers Sales, Purchases, Expenses, Income, Returns, Stock Adjustments,
      Salary, Transfers and Supplier Payments, since the frontend already
      funnels all of those through a single `addTransaction()`/
      `updateTransaction()` pair in `DataContext` — so POS/Sales is covered
      by this same sync. Same pattern as products: syncs when a Shop Owner
      token is present, falls back to `localStorage` otherwise.
- [x] **Stage 2d — done:** real Entities (Customers + Suppliers) backend —
      `GET/POST/PATCH /api/entities` (`backend/src/api/entities.ts`),
      Firestore path `businesses/{businessId}/entities/{id}`, mirrors
      `DataContext`'s `addEntity()`/`updateEntity()` (one shape, `type:
      'Customer' | 'Supplier'`). Same sync pattern as products/transactions.

**Core modules (Auth, Products, Sales/Ledger, Customers/Suppliers) are now
backend-backed** for Shop Owner accounts. Continue the same pattern
(collection under `businesses/{businessId}/...` + sync in the relevant
`DataContext`/`AuthContext` function) for whichever remaining module you
want done next.

- [x] **Stage 2f — done:** per-business Staff records —
      `GET/POST/PATCH/DELETE /api/staff` (`backend/src/api/staff.ts`),
      Firestore path `businesses/{businessId}/staff/{id}`. Note: this
      covers the staff *records* (HR view) only — the separate
      **"global employee registry"** (`bizora_global_employee_registry` in
      `localStorage`) that lets one mobile number log in as an employee
      across multiple businesses is a more involved, cross-tenant piece and
      is **not migrated yet**. Employee login still works exactly as
      before (locally), it just isn't backend-verified.

Still `localStorage`-only: Marketing, Support tickets, Reports, legacy
Staff-record login (the `nexus_staff` fallback check, distinct from the
employee registry below), and real OTP/SMS delivery for 2FA.

- [x] **Stage 2g — done:** Employee login is now backend-verified.
      `backend/src/api/employees.ts` adds a top-level Firestore
      `globalEmployees` collection (doc id = normalized mobile number,
      `employments[]` covers every business that employee works at),
      bcrypt-hashed PINs, and:
      - `POST /api/employees/link`, `PATCH /api/employees/:mobile`,
        `DELETE /api/employees/:mobile` (business-owner authenticated;
        called from `addStaff`/`updateStaff`/`deleteStaff`)
      - `POST /api/auth/employee-login` (public; mobile + PIN → JWT)

- [x] **Stage 2h — done:** cleaned up plaintext PIN handling in the two UI
      screens flagged earlier.
      - `PATCH /api/employees/me/pin` (new, `backend/src/api/employees.ts`)
        - self-service PIN change: requires the employee's own JWT,
        verifies the current PIN server-side with bcrypt, stores the new
        one hashed. `EmployeePortal.tsx`'s "change PIN" form now calls this
        instead of comparing `pinForm.currentPin !== currentEmployee.pin`
        in plaintext in the browser.
      - `EmployeeManagement.tsx` no longer reads an existing employee's
        plaintext PIN just to resend it unchanged (`handleEdit` and the
        "link existing employee to a new business" flow both used to do
        this even though neither actually changes the PIN) - it's simply
        omitted now, and `addStaff`/`updateStaff`/the backend already treat
        a missing PIN as "leave it as is".
      - Local `localStorage` mirrors (`bizora_global_employee_registry`,
        `nexus_staff_*`) still get a plaintext copy of the PIN written to
        them as an offline fallback - that's a deliberate, smaller
        remaining gap (documented, not silently left in place), not
        something achievable without either dropping the offline-login
        fallback entirely or hashing client-side.
- [x] **Stage 2i — done:** Inventory extras - Raw Materials, BOMs
      (recipes), and Production Batches. `backend/src/lib/
      simpleCrudRouter.ts` is a small factory for the repeated
      GET/POST/PATCH/DELETE-per-business shape (now used by products,
      entities, staff, raw materials, BOMs, and production batches), wired
      up as `/api/raw-materials`, `/api/boms`, `/api/production-batches`
      (`backend/src/api/manufacturing.ts`). Also closed two related gaps
      while here: `updateProductStock` (called by sales, purchases, and
      production - not just `updateProduct`) now syncs too, and
      `completeProductionBatch`'s raw-material consumption is synced
      per-material.
- [x] **Stage 2l — done:** `saasTickets` cross-tenant authorization -
      `POST/GET/PATCH /api/saas-tickets` (`backend/src/api/saasTickets.ts`),
      top-level Firestore collection with a `business_id` field. SaaS
      Owner/Admin can read/write every ticket; a business can only read/
      write its own - enforced server-side by role, not by what the client
      claims.
- [x] **Stage 2m — done:** real 2FA, replacing both remaining hardcoded
      secrets in `AuthContext.tsx`:
      - It turns out `initiate2faSetup()` was returning the **same fixed
        TOTP secret string for every single user** - meaning anyone who
        read that constant out of the compiled JS could generate valid
        codes for *any* account with 2FA turned on, not just guess a login
        OTP. This is now real per-user TOTP (RFC 6238, via `otplib`):
        `POST /api/auth/2fa/setup|enable|disable`
        (`backend/src/api/twoFactor.ts`) generate/verify a unique secret
        per user and store only the secret server-side.
      - Login for a 2FA-enabled account now only gets a **short-lived
        pre-auth token** from `/api/auth/login` - the real 7-day session
        token is only issued by `POST /api/auth/2fa/verify-login` after a
        valid TOTP code. Previously a full session token was issued before
        the 2FA check even ran, which meant 2FA was a client-side UI gate
        rather than an actual second factor protecting API access.
      - "Forgot PIN" (`recoverAccount`/`resetPassword`) now goes through
        `POST /api/auth/reset-pin/request` and `/confirm` - a real random
        6-digit code, bcrypt-hashed server-side with a 10-minute expiry,
        instead of accepting `'1234'`. **This still doesn't deliver the
        code anywhere** - `sendResetCode()` in `backend/src/api/auth.ts`
        just logs it to the server console, clearly marked as a stub. An
        actual SMS/email provider (Twilio, AWS SES, Resend, etc.) needs to
        be wired in there before this protects anything for real users -
        that requires your own provider account/API keys, which isn't
        something I can create for you.
      - Removed `verifyOtp()` - dead code, never called from any screen.
      - Note: TOTP setup/enable/disable/login only covers **Shop Owner**
        accounts (`businesses/{id}`) so far; SaaS Owner/Admin 2FA isn't
        wired to this endpoint yet.
- [x] **Stage 2n — done:** extended real 2FA (Stage 2m) to SaaS Owner and
      SaaS Admin accounts too. `backend/src/api/twoFactor.ts` now resolves
      the right Firestore doc per role - `businesses/{id}` for Shop Owner,
      `saasAdmins/{id}` for SaaS Admin, and a new single
      `saasOwnerConfig/owner` doc for the Owner (since the Owner's identity/
      password live in env vars, not Firestore, but their 2FA secret still
      needs somewhere to live). `saasAuth.ts`'s `/saas-login` now also
      branches into the same pre-auth-token flow when 2FA is on, and
      `complete2fa()` on the frontend builds the right session shape for
      whichever role actually completed the check instead of assuming Shop
      Owner.

All the roadmap items from this session are now done except the one that
needs something only you can provide: an actual SMS/email provider account
for `sendResetCode()` in `backend/src/api/auth.ts`.

- [x] **Stage 2o — done:** the remaining `DataContext` state groups that
      hadn't been touched yet:
      - Financial Accounts, Online Orders, Customer Groups -
        `/api/financial-accounts`, `/api/online-orders`,
        `/api/customer-groups` (same `simpleCrudRouter` pattern).
      - Courier Settings, Domain Settings, Shop Policies, Promo Codes,
        Categories, Expense Categories - these are all small, edited
        together, and change rarely, so instead of six separate synced
        setters they're bundled into one `GET`/`PUT
        /api/business-settings` (`backend/src/api/businessSettings.ts`,
        fields stored directly on the `businesses/{id}` doc) and a single
        `useEffect` in `DataContext` that PUTs the whole bundle whenever
        any of them change, gated behind `settingsLoadedRef` so it can't
        fire before the initial backend fetch and clobber real data with
        page-load defaults.
- [x] **Stage 2p — done:** `GlobalSupplier` migration (the gap flagged at
      the end of Stage 2o), which turned into a much bigger security pass
      once inside it - **six more hardcoded OTP/PIN bypasses** were found
      along the way and all fixed, on top of the migration itself:
      - **Supplier registry** - `backend/src/api/suppliers.ts`: business-
        owner-authenticated `POST /api/suppliers/link` (from
        `registerSupplier()`/`updateSupplierProfile()`), plus public
        `supplier-signup`/`supplier-login` - same cross-tenant shape as
        `globalEmployees` (Stage 2g), Firestore collection
        `globalSuppliers`.
      - **Customer Portal accounts** - new, previously fully
        `localStorage`-only and not covered by any earlier stage:
        `backend/src/api/customerAuth.ts` (`globalCustomers` collection) -
        `customer-signup`/`customer-login`/`customer-reset-pin`.
      - **Found while wiring the above - real bugs, not just style:**
        - `resetSupplierPin()` and `resetCustomerPin()` reset a PIN given
          only a phone number, **no OTP or any proof of ownership
          whatsoever** - anyone who knew (or guessed) a supplier's or
          customer's phone number could take over their account. Both now
          require a real random code (`/supplier-reset-pin/request` +
          `/confirm`, `/customer-reset-pin/request` + `/confirm`).
        - **Four separate hardcoded `'123456'` OTP checks** in `Auth.tsx`
          (supplier signup, customer signup, supplier PIN recovery,
          customer PIN recovery) - including UI text that displayed
          *"Use temporary development code 123456"* directly to end
          users. Replaced with `backend/src/api/phoneVerification.ts`, a
          small generic "send a real code / confirm a real code" pair
          used by all four flows.
        - The same hardcoded-`123456` pattern in two more places that
          weren't part of the initial login/signup screens:
          `SupplierPortal.tsx`'s and `CustomerPortal.tsx`'s in-app
          "change my mobile number" flows.
        - `SupplierPortal.tsx`'s and `CustomerPortal.tsx`'s in-app PIN
          change forms called `resetSupplierPin`/`resetCustomerPin`
          directly with no OTP at all (same root issue as above, just a
          different entry point) - both now have a real two-step
          request/confirm flow in the UI.
        - Shop Owner signup's phone/email verification step (`Auth.tsx`,
          `completeSignup`) accepted a hardcoded `otp !== '1234'` check -
          now uses the same `phoneVerification.ts` endpoints.
        - `SettingsPage.tsx`'s "Change Password" feature was **pure UI
          mockup with no backend call at all** - clicking through
          accepted `'1234'` and showed a success alert, but never
          actually changed anything. Added a real
          `PATCH /api/auth/me/password` endpoint (requires the *current*
          password, standard practice for a self-service password
          change) and a Current Password field in the form, which didn't
          exist before either.
      - All the delivery stubs added above log the code to the backend's
        own console (clearly marked `[DEV ONLY]`) - same caveat as
        Stage 2m: a real SMS/email provider still needs to be wired in
        before any of this protects real users.
- [x] **Stage 2q — done:** did a broader sweep of the codebase for
      `Mock`/`Simulate`/`TODO`-style comments to see if anything else in
      the same vein as Stage 2p was hiding. Found one more real issue and
      one functional (not security) gap worth flagging:
      - **`admin/src/components/AdminPanel.tsx` had a client-side
        privilege escalation.** Its "role preview" feature read the
        admin's effective permission level (`SUPER_ADMIN`/`ADMIN`/
        `SUPPORT`) from a `?simRole=` URL query parameter, **defaulting
        to `SUPER_ADMIN`** - meaning any authenticated SaaS Admin (not
        just the Owner) could simply add `?simRole=SUPER_ADMIN` to the
        address bar and the UI would show every Owner-only section.
        Fixed so the real role now comes from the authenticated session
        (`useAuth()`), and the URL override only works at all if that
        real role is already the Owner - a genuine Owner can still use it
        to preview the UI as a lower role, but nobody can use it to
        grant themselves anything.
      - **`ProductTransfer.tsx` (inter-store stock transfer) doesn't
        actually move any stock** - the handler shows a "Transfer
        successful!" message but the comment right above it says *"Logic
        to process transfer would go here... for now, we simulate
        success"*. Not a security issue, just an unbuilt feature -
        flagging rather than silently leaving it since the UI implies it
        works. **Built in Stage 2r below.**
- [x] **Stage 2r — done:** `ProductTransfer.tsx` now actually moves stock.
      Since a `Product` row belongs to one store (`storeId`) with one
      `stock` number - not a shared product with per-store counts - a
      transfer:
      1. Deducts the quantity from the source store's product via the
         already-synced `updateProductStock`.
      2. Looks for a matching product at the destination store (same SKU,
         or same name if there's no SKU) and tops it up the same way: if
         none exists yet, creates one there via `addProduct`, cloned from
         the source product's details.
      3. Logs a `'Transfer'` ledger entry (zero amount, just an audit
         trail) via `addTransaction`.
      The product picker is also now filtered to the selected source store
      (it previously showed every product regardless of store, and the
      "available stock" check used the global stock number rather than
      that store's).

Reports (`BusinessReports.tsx`, `StockReport.tsx`) need no separate
migration - they're computed entirely from `products`/`transactions`/etc.
via `useData()`, which are already backend-synced as of the stages above.
(`StockReport.tsx` does keep its own small `stock_notes` in `localStorage`
for free-text annotations - that's fine to stay local, it isn't business
data.)
- [x] **Stage 2k — done:** while looking at the legacy staff-login
      fallback, found it was two separate issues, both now fixed:
      1. It read a flat `nexus_staff` `localStorage` key that **nothing in
         the app ever writes** (staff are stored per-business as
         `nexus_staff_{userId}`, and separately in the global employee
         registry) - it could never have fired. Removed as dead code
         rather than "migrated", since there was nothing real to migrate.
      2. `verifyPassword()` (the re-auth check used before sensitive
         actions) **still had the same hardcoded SaaS Owner/Admin
         passwords** (`'Nusaiba1'`, `'saas123'`) that Stage 2e was
         supposed to remove - they were left behind in this second
         function. Now uses `POST /api/auth/verify-password`
         (`backend/src/api/auth.ts`), which identifies the caller from
         their own JWT (so it can only ever check the logged-in user's own
         password) and compares against the right bcrypt hash for their
         role (env var for Owner, Firestore for Admin/Shop Owner).
- [x] **Stage 2j — done:** Support Tickets, Customer Feedback, and
      Marketing Campaigns - `/api/support-tickets`, `/api/feedbacks`,
      `/api/marketing-campaigns` (`backend/src/api/support.ts`, also built
      on `simpleCrudRouter`). `saasTickets` (support tickets between a
      business and the SaaS platform itself) is intentionally **not**
      included here - it needs a different authorization model (both the
      business and a SaaS Owner/Admin must be able to read/write the same
      ticket), unlike everything else so far which is scoped to one
      business's own token.

### ⚠️ Security note found during Stage 2a

~~`AuthContext.tsx`'s SaaS Owner/Admin login had a hardcoded master password
("Nusaiba1") and a hardcoded second admin password ("saas"/"saas123")
shipped directly in the client bundle.~~ **Fixed** — see Stage 2e below.

The 2FA/OTP code (`complete2fa`/`verifyOtp`) is still hardcoded to accept
`"1234"` and is **not wired to any real SMS/email delivery**. It's off by
default for every account type migrated so far, so it isn't exposed unless
a user explicitly enables 2FA — but don't rely on it for real security until
a real OTP provider (Twilio, SES, etc.) is integrated on the backend.

- [x] **Stage 2e — done:** moved SaaS Owner/Admin login off hardcoded
      client-side credentials. `POST /api/auth/saas-login`
      (`backend/src/api/saasAuth.ts`) checks the Owner against backend env
      vars (`SAAS_OWNER_EMAIL`/`SAAS_OWNER_MOBILE`/
      `SAAS_OWNER_PASSWORD_HASH` — generate a hash with
      `node backend/scripts/generate-password-hash.mjs "your password"`)
      and additional SaaS Admins against a Firestore `saasAdmins`
      collection (bcrypt-hashed, managed via `GET`/`POST
      /api/auth/saas-admins`, Owner-only). The old hardcoded checks and the
      local plaintext `saas_admins` localStorage check are removed from
      `AuthContext`.

- [x] **Stage 3a — done (feature build, not a bug fix):** real-time chat +
      AI chatbot + live agent hand-off, on request.
      - **Real-time layer:** `backend/src/lib/chatSocket.ts` adds
        Socket.io on the same HTTP server as the REST API (no separate
        port/process). Connections are JWT-authenticated the same way as
        REST calls; a business joins room `business:{id}`, SaaS Owner/Admin
        join a shared `saas-staff` room - same access model as
        `saasTickets.ts`. `POST`/`PATCH /api/saas-tickets` now also call
        `broadcastTicketUpdate()`, so a new ticket or a new message shows
        up instantly on the other side instead of waiting for a page
        reload. `shared/lib/chatSocket.ts`'s `useChatSocket()` hook is
        wired once into `DataContext` and live-merges into the existing
        `saasTickets` state - so **both** `CustomerSupport.tsx` (business
        side) and `AdminPanel`'s Support Inbox (SaaS staff side) update
        live with zero changes needed in either of those already-existing
        UIs. This is additive: if the socket can't connect, the existing
        REST fetch/refresh still works exactly as before.
      - **AI chatbot:** the "Live Chatbot" card in `CustomerSupport.tsx`
        used to be `alert("Chatbot coming soon")` - it now opens the
        already-built `/ai-chat` (Gemini-powered `AIChat.tsx`, using the
        pre-existing `/api/ai/chat` endpoint) instead of duplicating a
        second chat UI.
      - **Agent hand-off:** added a "Talk to an Agent" button to
        `AIChat.tsx` that creates a `saasTicket` pre-filled with the chat
        transcript and jumps to `CustomerSupport.tsx` - from there it's a
        real-time conversation with a human via the socket layer above.
      - Needs `npm install` in `backend`, `frontend`, and `admin` to pick
        up the new `socket.io`/`socket.io-client` dependencies.
- [x] **Stage 3b — done:** removed the Gemini AI dependency entirely, on
      request - the chatbot is now a fully self-contained system with no
      external AI API call of any kind.
      - `backend/src/lib/knowledgeBase.ts` - a plain array of
        `{keywords, question, answer}` FAQ entries covering the main
        Bizora workflows (sales, inventory, staff/HR, reports,
        subscription, account/security). Add more entries here directly -
        no other code needs to change.
      - `backend/src/lib/chatBot.ts` - matches the user's message against
        that knowledge base by keyword overlap (pure string matching, runs
        entirely on this server, no network call out) and returns the
        best match, or a "connect me to an agent" fallback if nothing
        matches well enough.
      - `POST /api/ai/chat` (same endpoint `AIChat.tsx` already called)
        now calls this instead of the Gemini API. `@google/genai` is
        removed from `backend/package.json`, `GEMINI_API_KEY` removed from
        `.env.example`, and the unused `AiModelType` enum (Gemini model
        name constants that were never referenced anywhere) removed from
        `shared/types.ts`.
      - Updated `AIChat.tsx`'s copy so it accurately describes a
        knowledge-base assistant instead of implying open-ended generative
        capabilities (like "generate marketing copy") it no longer has -
        the "Talk to an Agent" escalation from Stage 3a is unchanged and
        is how anything outside the knowledge base actually gets handled.
- [x] **Stage 3c — done:** while removing Gemini, found a second, separate
      fake "AI" feature that was never actually connected to Gemini (or
      anything) in the first place - `admin/src/components/AdminPanel.tsx`'s
      "AI Center" tab:
      - Its two metric cards were hardcoded (`0 Businesses`, `All Branches
        Optimised`) regardless of actual data, and its chat box returned
        the **exact same canned sentence** ("...subscription growth
        remains robust at +15% MoM, with a perfect zero-churn rate
        forecast...") no matter what was typed.
      - Replaced with real computed values from `registeredUsers`/
        `saasTickets` (both genuinely backend-synced by this point): an
        "At-Risk Businesses" count (2+ open tickets - the closest honest
        signal available without payment-history/login-activity data,
        which the UI now says outright instead of pretending to have it),
        an actual open/urgent ticket count, and a query box
        (`getAdminAnalyticsReply()`) that answers real questions about
        tickets/plans/business counts from that same data - same
        "keyword match against real logic" approach as the support
        chatbot, not a coincidence.
      - Renamed the tab/labels from "AI Center"/"Bizora Enterprise AI
        Assistant" to "Analytics Center"/"Analytics Query Assistant" so
        the naming matches what it actually does now.
- [x] **Stage 3d — done:** swept the rest of the app for "AI" branding
      after finding two fake ones in a row (Stage 3c). Found one more real
      bug and cleaned up the rest of the labeling:
      - **`BusinessReports.tsx`'s "Sales are up X%" insight was
        hardcoded to always show ~11.1% positive growth**, regardless of
        actual performance - the "previous period" it compared against
        was computed as `currentSales * 0.9`, not real data. Replaced
        with a genuine previous-period comparison: an equivalent-length
        prior date range is derived from whatever range is selected
        (3 months/year/custom) and real `'Sale'` transactions in that
        window are summed. For "Lifetime" (no meaningful previous
        period) or a previous period with zero sales, it now says so
        honestly instead of showing a fabricated percentage.
      - Renamed the `'Advanced AI Analytics'` feature-flag string (used
        for plan gating) to `'Advanced Analytics'` everywhere it appears
        (`BusinessReports.tsx`, `ProductList.tsx`, `AuthContext.tsx`,
        `AdminPanel.tsx`) - the underlying feature (the Trends & Growth
        tab, now backed by the real insight above) isn't AI, so the name
        shouldn't say it is.
      - Removed a hardcoded, meaningless **"1500 / 2000 AI Requests
        used"** progress bar from `Dashboard.tsx` and the matching
        **"AI Requests: 50/mo / 5000/mo / Unlimited"** row from
        `Subscription.tsx`'s plan comparison table - there's no such
        thing as an AI request quota now that the chatbot doesn't call
        an external API. The Dashboard card shows real plan info
        (`user.plan`/`user.isPremium`, real unlocked feature count)
        instead.
      - Fixed a couple of smaller copy-only mentions (`SettingsContext.tsx`
        onboarding tour text) the same way.
      - Also noticed while there: the same Dashboard card had a hardcoded
        `"Pro"` badge and `"Valid until Dec 31, 2024"` (already in the
        past) regardless of the account's actual plan - now shows the
        real `user.plan`/`user.isPremium` status. There's no real
        subscription billing-date field anywhere yet, so rather than
        invent one, it just says "Active Plan" / "Free Plan" instead of a
        fabricated date.

## Stage 4 — blueprint gap-filling (see `BLUEPRINT_CROSSCHECK.md`)

Built the items requested from the cross-check's 🟡/❌ list:

- **SaaS Admin: real business approve/suspend/plan/delete.**
  `backend/src/api/businessAdmin.ts` already existed with exactly this
  (GET/PATCH/DELETE `/api/admin/businesses/:id`, real `accountStatus`
  gate checked at login in `auth.ts`, audit-logged) - it just wasn't
  mounted in `server.ts`. Mounted it, and wired `AdminPanel.tsx`'s
  Business Management tab to actually call it (fetch the real list on
  load; status/plan edits now PATCH the backend, not just local state;
  delete calls the real endpoint too) instead of only ever touching
  `registeredUsers`.
- **SaaS Admin: real System Settings + Subscription Plans.**
  New `backend/src/api/platformConfig.ts` - `GET/PUT
  /api/platform/settings` (branding, SMTP host, SMS gateway URL) and
  `GET/PUT /api/platform/plans`, both Firestore-backed
  (`platformConfig/settings` and `platformConfig/subscriptionPlans`
  docs), Owner/Admin-only to write, public to read (signup/subscription
  pages need plan data without a SaaS login). `/api/business/config`
  (used by the business-owner-side Subscription page) now reads the
  real plans doc instead of a hardcoded object baked into `server.ts`.
  AdminPanel's System Settings tab now loads/saves for real.
- **SaaS Admin: real Audit Logs.** `businessAdmin.ts`'s
  `GET /api/admin/audit-logs` (also pre-existing, also unmounted) now
  feeds AdminPanel's System Logs tab - real entries written by
  `logAudit()` calls in `businessAdmin.ts`/`platformConfig.ts`, not an
  array that started empty and had a "Clear Logs" button that could
  wipe it (removed that button - an audit trail shouldn't be
  user-clearable).
- **SaaS Admin: real Server Monitoring.** `businessAdmin.ts`'s
  `GET /api/admin/system-health` now returns real `os.loadavg()`-based
  CPU and real `os.totalmem()/freemem()` memory percentages, not just
  this Node process's own heap stats. AdminPanel's Monitoring Center
  polls it every 15s. The fabricated "Worker Queue Load: Active (0
  Pending)" bar and fake cron-job log lines were replaced with an
  honest note - there's no queue/cron system in this backend, so
  nothing to report there.
- **Quotations.** New `Quotation` type + full CRUD in `DataContext.tsx`
  (`backend/src/api/quotations.ts`, `businesses/{id}/quotations/{id}`),
  a new `Quotation.tsx` page (create with a product picker, status
  workflow Draft → Sent → Accepted/Rejected, auto-flags Expired past
  `validUntil`), and `convertQuotationToSale()` which turns an accepted
  quote into a real Sale transaction through the same
  `addTransaction()`/`updateProductStock()` path POS uses - deducts
  stock and posts to the ledger exactly like a normal sale.
- **Installment Sales - corrected in the cross-check, not rebuilt.**
  Turned out this already existed and works: `Sell.tsx` lets you split a
  sale into an installment schedule (`LedgerEntry.installments[]`),
  which is real and backend-synced since Stage 2c. The cross-check's ❌
  was wrong to call it fully missing - the one real gap is there's no
  dedicated "installments due" collection/tracking screen, only the
  schedule shown on the invoice at sale time.
- **Journal / Trial Balance / Balance Sheet - also corrected.** Balance
  Sheet and Income Statement (P&L) already existed in
  `BusinessReports.tsx`'s Financials tab, computed from real data - the
  cross-check's ❌ was wrong here too. What was actually missing was
  Trial Balance, now added as a new "Accounting" tab. Since this system
  records single-entry ledger rows rather than posting formal
  double-entry journal entries, the Trial Balance is honestly labeled
  as *derived* from the same real figures behind the Balance Sheet/P&L,
  with "Retained Earnings" as a balancing plug rather than a posted
  account - the UI says so outright rather than presenting it as a real
  general ledger.
  - **Also fixed while in there:** the P&L's "Cost of Goods Sold" line
    was computed as a flat `(sales × 0.7)` guess for *display only*,
    while the Gross Profit figure right next to it was already using a
    real per-item COGS (`productCost`, summed from each sold item's
    actual `purchasePrice`) computed elsewhere in the same file. The two
    numbers didn't agree with each other. Now the COGS line displays
    that same real `productCost` instead of a separate fake estimate.

`BLUEPRINT_CROSSCHECK.md` has been updated to reflect all of the above.

- **Installments collection screen** — the one real gap flagged for
  Installment Sales (schedules existed but nothing to track/collect
  them). New `InstallmentLedger.tsx` (`/installments` in the Finance
  nav section) flattens every installment across every Sale into one
  list, auto-computes Overdue for anything past its due date without a
  separate write, and "Mark Paid" updates the real `installments[]`
  array on the parent Sale (via the already-synced `updateTransaction`)
  and posts a real Income entry so the collection shows up in cash flow
  too - not a separate, disconnected "paid" flag.

## Stage 5 — Kitchen Order Ticket (KOT), on request

Built the full Kitchen Order system from the blueprint's POS section:

- **New `KitchenOrder` type + backend** (`backend/src/api/kitchenOrders.ts`,
  `businesses/{id}/kitchenOrders/{id}`, same `simpleCrudRouter` pattern
  as everything else) - `items[]`, `tableNumber`, `orderType`
  (Dine-In/Takeaway/Delivery), and a `status` that moves through
  `Pending → Preparing → Ready → Served` (or `Cancelled`).
- **`Sell.tsx`** now shows a "Kitchen Order" panel - order type, table
  number for dine-in, and a **"Send to Kitchen"** button - only for
  accounts with `businessType === 'Restaurant'`, so retail/other
  business types see no change at all. Sending to kitchen creates the
  KOT immediately, *before* checkout/payment is finalized, so the
  kitchen can start cooking while the bill is still open; once checkout
  completes, the linked KOT is auto-advanced to "Preparing".
- **New `KitchenDisplay.tsx` page** (`/kitchen`, also restaurant-only in
  the nav) - a real Kitchen Display System (KDS): three live columns
  (New Orders / Preparing / Ready to Serve), each order card shows
  items, table/order type, and minutes-since-sent (flagged red past 15
  minutes), with a one-tap button to advance it to the next stage.
  "Served" orders drop off the board and count toward a daily served
  total.
- Kept deliberately scoped to what the blueprint's POS section actually
  asked for (Kitchen Order / KOT) - no multi-kitchen-station routing or
  printer-specific ticket formatting beyond a basic browser print,
  since neither was in the request.

## Stage 5b — multi-kitchen-station routing + printer-format ticket, on request

- **Multi-station routing.** `Product` gets an optional `kitchenStation`
  field (e.g. "Grill", "Bar", "Dessert") - shown as a restaurant-only
  input in `ProductList.tsx`'s product form, with a datalist of common
  suggestions. `KitchenOrder` now carries a `station` field, and
  `Sell.tsx`'s "Send to Kitchen" groups the cart by each item's
  station and creates **one ticket per station** (sharing a `groupId`
  so they're still traceable back to the same table/order) instead of
  one combined ticket - so the grill station only ever sees grill
  items, the bar only sees drinks, etc. Checkout still advances every
  station ticket from that sale to "Preparing" together.
  `KitchenDisplay.tsx` gained station filter tabs ("All Stations" plus
  one per station actually in use, derived from real order data - not
  a hardcoded list) and shows the station on each card when viewing
  "All Stations".
- **Printer-format ticket.** New `KOTTicket.tsx` - a proper
  thermal-printer-style ticket (narrow, monospace, `@page { size: 80mm
  auto }`), deliberately separate from `InvoiceTemplate.tsx` (the
  customer receipt) since a kitchen printer is normally a different,
  narrower thermal printer than the POS one, and a kitchen ticket
  shouldn't show prices or customer-facing branding. Shows station,
  table/order type, ticket number, time, and the item list. The KDS's
  print button now opens this real ticket instead of just calling
  `window.print()` on the dashboard card itself.

## Legacy files

`remove_admin_mock.ts`, `remove_mock_data.ts`, and `update_data_context.ts`
from the original project were one-off migration scripts (not part of the
running app) — kept at the repo root for reference but not wired into any
build.

## Stage 6 — Revenue Management, Announcements, System Settings, on request

- **System Settings — completed.** Extended `platformConfig.ts`'s
  settings doc with `defaultCurrency`, `defaultTimezone`, `logoUrl`,
  `faviconUrl`, `seoTitle`, `seoDescription` (branding/SMTP/SMS were
  already real from Stage 4). **Found a real bug while extending it:**
  the "System Currency Symbol" `<select>` in AdminPanel had no `value`
  or `onChange` at all - it was fully disconnected, always showed
  whatever the browser defaulted to, and Save never read it. Now it's a
  controlled input wired to the real setting, alongside a new Timezone
  selector and Logo/Favicon/SEO fields.
- **Announcement/Notifications — completed.** New
  `backend/src/api/announcements.ts`: SaaS Owner/Admin create global or
  business-targeted announcements (`POST /api/admin/announcements`),
  any authenticated business user fetches what's active for them
  (`GET /api/announcements`). **Found a real bug:** the existing
  "Broadcast Global Alert Banner" feature in AdminPanel only ever wrote
  to `localStorage` - meaning the SaaS Owner could "broadcast" a banner
  that literally no business could ever see, only their own browser.
  Replaced both duplicate copies of that broadcast UI with real
  `POST`/`PATCH` calls, and added a real banner display to the business
  app's `Layout` (`App.tsx`) that polls for active announcements every
  60s and lets the business dismiss it (tracked locally so it doesn't
  reappear once acknowledged).
- **Revenue Management — completed.** New `backend/src/api/revenue.ts`.
  Since no live payment gateway is connected (flagged elsewhere as a
  separate, out-of-scope item needing real merchant accounts), the
  honest, buildable version of "Subscription Income" is a **manual
  payment ledger** - the SaaS team records a payment after collecting
  it out-of-band (bank transfer, in person, etc.), same as how many
  small SaaS operations actually work before a gateway is wired in.
  Replaced the old Revenue Center's fake stat cards (hardcoded
  `"100% Platform"` and `"Settled"` regardless of anything) and its
  local-only mock "Refund Requests Queue" (2 fake seeded rows, changes
  never persisted) with: a real Payments Ledger (`GET/POST
  /api/admin/revenue/payments`), a Refund action
  (`PATCH .../payments/:id/refund`), and summary totals
  (`GET /api/admin/revenue/summary`) computed from those real records
  instead of placeholder numbers.

`BLUEPRINT_CROSSCHECK.md` updated for all three.

## Stage 7 — Purchase Order workflow + HRM Department/Designation, on request

- **Purchase Order (order → receive stage).** Purchases used to only be
  recordable as already-received (`Buy.tsx` straight to a `Purchase`
  transaction). Added the missing pre-receipt stage: new `PurchaseOrder`
  type + full CRUD (`backend/src/api/purchaseOrders.ts`,
  `businesses/{id}/purchaseOrders/{id}`), a new `PurchaseOrder.tsx` page
  (`/purchase-orders`) to create POs with a supplier + product picker
  and an expected-delivery date, and `receivePurchaseOrder()` which
  converts an Ordered PO into a real Purchase transaction on receipt -
  reusing the same `addTransaction()`/`updateProductStock()` path
  `Buy.tsx` uses, so stock and the ledger only change when stock
  actually arrives, not when it's merely ordered. `Buy.tsx` itself is
  unchanged - it's still there for recording an already-received
  purchase directly, same as before; the PO flow is an additional path
  for when there's a real gap between ordering and receiving.
- **HRM: Department & Designation.** New managed reference lists
  (`backend/src/api/hrm.ts`, `/api/departments` + `/api/designations`),
  a new `DepartmentDesignation.tsx` screen (`/hr-structure`) to manage
  both (designations can optionally belong to a department). Added an
  optional `Designation` dropdown to `EmployeeManagement.tsx`'s Add
  Staff form, sourced from this real list - **deliberately kept
  separate from the existing "Role" field**, which is a fixed set of
  four options (Manager/Salesperson/Stock Manager/Cashier) tied to the
  permission system; conflating a free-form job-title list with the
  thing that actually gates access would have been a real access-control
  regression, not a UX improvement. `Staff` gained optional
  `designationId`/`departmentId` fields for this - `role` and
  `permissions` are untouched.
- Blueprint's Shift/Holiday (also under HRM alongside Department/
  Designation) weren't part of this round - still open in
  `BLUEPRINT_CROSSCHECK.md`.

## Stage 8 — Loyalty Program + Coupon System, on request

- **Found a real bug while starting this:** loyalty points were already
  being awarded on every Sale (`updateLoyaltyPoints`, called from
  `addTransaction`), but it wrote through a raw `setCustomers(...)`
  instead of `updateEntity(...)` - meaning every point ever earned only
  existed in that browser tab's memory and was **silently lost** on the
  next reload/refetch from `/api/entities`, despite `Entity`/customers
  being backend-synced since Stage 2d. Fixed to go through `updateEntity`
  so it actually persists. Also replaced the hardcoded "1 point per 100
  spent" with a real configurable rate (see below).
- **Loyalty Program - real rules engine.** New `LoyaltyConfig`
  (enabled toggle, earn rate, redemption rate, minimum-to-redeem),
  synced via the same business-settings bundle mechanism as
  `courierSettings`/`promoCodes` (Stage 2o's pattern -
  `businessSettings.ts` now includes `loyaltyConfig`). New "Loyalty
  Program" tab in `Marketing.tsx` to configure it and see every
  customer's real points balance + redeemable value. `Sell.tsx` gained
  a real redemption flow at checkout: enter points to redeem (capped by
  what the customer actually has and by the configured minimum), see
  the resulting discount live, and on successful checkout
  `redeemLoyaltyPoints()` actually deducts them.
- **Coupon System - real validation.** `PromoCode` gained
  `minPurchase`, `maxDiscount`, `usageLimit`/`usedCount`, and
  `validUntil`. New `validateCoupon()` checks all of them (previously
  `Sell.tsx` only checked `status === 'active'`, ignoring everything
  else even though some of those fields already existed on the type)
  and `recordCouponUsage()` actually increments the usage count on a
  successful sale, so `usageLimit` is real and not just decorative.
  `Marketing.tsx`'s promo creation form and table were extended to
  set/show all of this - including a table status column that now
  says "expired" / "limit reached" instead of always showing "active"
  regardless of whether the coupon can still actually be used.


## Stage 9 — Product Attributes (Category / Brand / Unit / Warehouse)

- **Managed lists**: Brands and Units join Categories in the business-settings bundle (Firestore-backed via `/api/business-settings`).
- **Warehouses**: New collection `businesses/{id}/warehouses` with full CRUD at `/api/warehouses`. Products can optionally set `warehouseId`.
- **UI**: New page `/product-attributes` (Categories & Brands) to manage categories + sub-categories, brands, units, and warehouses (set default warehouse).
- **Product form**: Category, Sub-category, Brand, Unit are dropdowns from managed lists (not free-text); Warehouse selector added.
- Variants UI, barcode/QR generate, and CSV import (Papa Parse) were already present on Product List — left as-is.


## Stage 10 — Bulk CSV polish, Serial Numbers, Visual QR

- **CSV Export/Import**: Export now includes Batch, SerialNumbers, QR, Warehouse, Expiry with proper CSV escaping. Import maps the same columns (SerialNumbers pipe/comma/semicolon separated).
- **Serial Numbers**: `Product.serialNumbers: string[]` + form textarea under Tracking. Optional note when count differs from stock.
- **Visual QR**: Generate uses SKU/Barcode when available; live PNG preview via public QR API + download link (no new npm dependency).
- Note: Bulk Import/Export UI already existed — Stage 10 makes the data round-trip complete rather than inventing a new feature from scratch.


## Stage 11 — Barcode Scanner Integration

- **Reusable `BarcodeScanner` component** (`frontend/src/components/BarcodeScanner.tsx`):
  - Camera scanning via native **BarcodeDetector** API (Chrome/Edge, HTTPS or localhost)
  - Torch toggle when the device supports it
  - Manual entry + **USB/Bluetooth keyboard-wedge** scanners (type code + Enter)
- **POS (`Sell.tsx`)**:
  - Barcode button opens the camera scanner modal
  - Search box accepts hardware scans (Enter): exact match on barcode / SKU / QR / id → add to cart
  - Product search also matches barcode and SKU
  - Success/error feedback + short beep on successful scan
- **Product List**: "Scan" next to barcode field fills the barcode from camera or wedge scanner


## Stage 12 — HR Work Shifts & Company Holidays

- **WorkShift** & **Holiday** types in DataContext with Firestore-backed CRUD (`/api/work-shifts`, `/api/holidays`).
- **HR Structure** page (`/hr-structure`): manage Departments, Designations, Shifts (start/end/break), and Holidays (date, recurring yearly, paid/unpaid).
- **Staff.shiftId**: optional shift assignment on Add Employee; shown on staff cards.
- **Attendance**: selected date shows a holiday banner when it matches a company holiday (including recurring by month-day).


## Stage 13 — Gift Cards & Referral Program

- **GiftCard** resource: issue cards with code/balance/expiry; disable; redeem at POS (reduces due, notes on sale). Backend `/api/gift-cards`.
- **ReferralConfig** in business settings (enable, referrer/referee points, min sale for referrer reward).
- **Marketing** tabs: Gift Cards + Referral (generate/copy customer codes, link referredBy).
- On first qualifying **Sale**, `processReferralRewardsOnSale` awards loyalty points to the referrer.
- Customer fields `referralCode` / `referredBy` / `walletBalance` were already on Entity — now used end-to-end.


## Stage 14 — Refresh Token Rotation

- **Access token** short TTL (default `15m`, `JWT_ACCESS_TTL`) for `Authorization: Bearer`.
- **Refresh token** longer TTL (default `7d`); stored in Firestore `refreshTokens` by `jti` and **rotated** on each `POST /api/auth/refresh`.
- Login/register return `{ accessToken, refreshToken, token }` (`token` aliases access for older clients).
- `authFetch` retries once after refresh on HTTP 401; failed refresh clears tokens.
- Logout: `POST /api/auth/logout` revokes the refresh `jti`.
- Middleware rejects `typ: refresh` and pre-auth tokens on protected routes.


## Stage 15 — Automatic & Cloud Backup

- Manual JSON download/restore already existed under Settings → Data & Backup.
- **Cloud backups** API: `GET/POST/DELETE /api/backups` (payload stored on `businesses/{id}/backups`, size capped ~900KB for Firestore limits).
- **Automatic backup** (while app is open): enable in Settings, choose interval (1h–7d) and retention (keep last N cloud copies).
- Always writes a rolling **local** copy under `bizora_local_backup_{userId}` as fallback if cloud rejects (e.g. too large).
- Cloud list: restore or delete individual snapshots; restore runs `importData` then reloads.
- `getAllData()` expanded (gift cards, warehouses, HR structure, loyalty/referral, quotations, POs, KOTs, …).


## Stage 16 — Payroll backend resource

- **PayrollRun** model: period (YYYY-MM), staff, breakdown (basic, bonus, commission, advances, absence, fine), netPay, linked expense `transactionId`, status Paid/Void.
- API: `/api/payroll-runs` (Firestore `businesses/{id}/payrollRuns`).
- Paying salary still posts an Expense ledger entry **and** creates a durable payroll run (backend-synced).
- Duplicate pay for same staff+period warns before proceeding.
- Payroll history table with Void (does not auto-reverse the expense).


## Stage 17 — Production OTP / password reset delivery

- Shared helper `backend/src/lib/notify.ts`:
  - **SMS:** Twilio REST (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`)
  - **Email:** Resend (`RESEND_API_KEY`, `EMAIL_FROM`)
- Wired into:
  - Shop owner `POST /api/auth/reset-pin/request` (email + mobile on account)
  - Customer / supplier PIN reset
  - Phone verification (`/api/auth/phone-verify/request`)
- **Production** without a provider → `503` (no silent success).
- **Development** without a provider → code logged to server console.
- **60s cooldown** between resends (`resetCodeLastSentAt` / `lastSentAt`).
- Optional `OTP_DEV_ECHO=true` returns `devCode` in JSON for local QA only.


## Stage 18 — OTP pepper + attempt lockout

- OTP hashes use **pepper** (`OTP_PEPPER` or fallback `JWT_SECRET`) mixed into the code before bcrypt (`hashOtp` / `verifyOtp`).
- Failed verifies increment `resetCodeFailedAttempts`; after `OTP_MAX_ATTEMPTS` (default 5) the account/OTP is locked for `OTP_LOCK_MS` (default 15 min).
- Successful confirm clears hash, expiry, attempts, and lock fields.
- Applies to shop-owner reset, customer/supplier PIN reset, and phone verification.


## Stage 19 — Journal (double-entry), Leave management, Payroll void reversal

- **General Journal** (`/journal`): multi-line double-entry posts (debits must equal credits), default chart of accounts, trial balance from journal. API `/api/journal-entries`.
- **Leave requests** (Employees → Leave): request/approve/reject/cancel; approve marks attendance `Leave` for each day in range. API `/api/leave-requests`.
- **Payroll void**: sets run to Void **and** posts an **Income** reversing entry for `netPay` (reference links original salary tx).


## Stage 20 — Payment gateway foundation

- Providers: **sandbox** (in-app confirm), **Stripe** Checkout Session, **bKash** tokenized (sandbox URL default).
- API: `POST/GET /api/payments/intents`, `POST .../confirm`, `GET /api/payments/providers`, webhooks `/api/payments/webhook/stripe|bkash`.
- Intents stored under `businesses/{id}/paymentIntents`; external IDs indexed for webhooks.
- UI: **Online Payments** (`/payments`) — create intent, open checkout URL, confirm sandbox.
- Configure keys in backend env (`STRIPE_*`, `BKASH_*`). Without keys, only sandbox works.


## Stage 21 — Permissions enforce, Impersonation API, Dashboard aggregates, Subscription

### Employee permission backend enforce
- `requirePermission(...keys)` in `middleware/auth.ts`.
- EMPLOYEE JWT includes `businessId`, `permissions[]` (from employment/staff).
- `getActingBusinessId()` used so employees access the correct business collections.
- Staff write, product mutations, transaction post require relevant permission keys.
- Shop owner / SaaS / impersonation tokens bypass permission checks.

### SaaS Login-as / impersonation
- `POST /api/admin/impersonate` issues a 1h `SHOP_OWNER` access token with `impersonated: true` + audit log.
- `AuthContext.impersonateUser` uses the API (stores SaaS token backup; exit restores it). Local fallback remains if API is down.

### Admin dashboard server aggregates
- `GET /api/admin/dashboard-stats` — businesses by status, plans, tickets, revenue totals, recent signups.
- Admin dashboard shows a **Server aggregates** banner when the endpoint responds.

### Subscription
- `PATCH /api/admin/businesses/:id/subscription` — `plan`, `isPremium`, `subscriptionStatus`, `subscriptionRenewsAt`, `autoRenew`, `subscriptionEnforce`, features.
- Optional hard block when `subscriptionStatus=Expired` and `subscriptionEnforce=true` (402 on shop API calls).


## Stage 22 — Product Variants (POS + matrix)

- Product form: **Generate matrix** from Colors × Sizes; optional per-variant **price** / SKU / barcode.
- POS: products with variants open a **Select variant** modal (stock + price); cart line is unique per variant.
- Barcode/SKU scan matches **variant** barcode/sku and adds that variant.
- `updateProductStock(..., variantId)` adjusts variant stock and rolls up product total stock; syncs via product PATCH.


## Stage 23 — Offline transaction queue

- `shared/lib/offlineQueue.ts`: persistent queue in `localStorage` (`bizora_offline_queue`).
- When offline (or network error on POST), **sales/transactions** and **product stock PATCHes** are enqueued.
- On `online` event (and on load if queue non-empty): `flushOfflineQueue(authFetch)` replays ops.
- App banner: offline message + pending count + **Sync now** when online with queued items.
- Idempotent de-dupe by transaction id; max 8 attempts then drop with console warning.


## Stage 24 — Offline sync conflict resolution

### Server
- **Transactions POST**: same client `id` → **200 + already_exists** (idempotent, does not overwrite).
- **Transactions PATCH**: optional `baseUpdatedAt` / stale → **409**.
- **Products PATCH**:
  - `stockDelta` / `variantStockDeltas` → **relative** apply (safe concurrent offline sales).
  - Absolute field write with mismatched `baseUpdatedAt` → **409** + server snapshot.

### Client queue
- Stock changes enqueued as **deltas**, coalesced per product path.
- Flush handles **409**: log conflict (`bizora_offline_conflicts`), `kept_server` / `rejected_stale` / `dropped`.
- Banner shows conflict count + **Dismiss conflicts**.


## Stage 25 — Permission expand (backend)

`requirePermission` applied across shop-scoped write (and most read) APIs:

| Area | Keys |
|------|------|
| Products | inventory.view / add / edit / delete, pos.sell |
| Transactions | pos.sell, pos.view_sales, finance.* |
| Staff / HR / Leave / Payroll | hr.manage, hr.payroll |
| Entities (customers/suppliers local) | crm.view, crm.manage |
| Warehouses | inventory.* |
| Journal | finance.ledgers, finance.accounts |
| Quotations / KOT | pos.sell, pos.view_sales |
| PO / Manufacturing | inventory.purchase, inventory.production |
| Gift cards / Marketing / Support | crm.*, shop.* |
| Financial accounts | finance.cashbox, finance.accounts |
| Online orders | shop.orders, shop.manage |
| Business settings / backups | admin.settings |
| Payment intents | finance.cashbox, finance.accounts |

`createSimpleCrudRouter` now accepts `writePermissions` / `readPermissions`.
Shop owner, SaaS, and impersonation tokens still **bypass** permission checks.


## Stage 26 — RBAC role mapping

- `shared/utils/rbacRoles.ts` (+ backend `src/lib/rbacRoles.ts`): role templates → permission keys.
- Presets: **Manager, Cashier, Salesperson, Stock Manager, Accountant, HR Manager, Kitchen, Viewer, Custom**.
- Access Control UI: pick a template to fill permissions; Custom allows manual toggles.
- `resolveStaffPermissions()` unions template + extra grants; `all` / Manager → full shop (non-SaaS) set.
- Employee login JWT permissions resolved from staff `roleTemplateId` / `role` when stored permissions are empty or incomplete.


## Stage 27 — Journal auto-post + Subscription expiry UX

### Journal auto-post
- `shared/lib/journalAutoPost.ts` maps ledger types → balanced journal lines (Cash/Bank, AR, AP, Inventory, Sales, COGS, OpEx, Salary).
- `addTransaction()` creates an auto journal entry (`aje-{txId}`) when type is Sale, Purchase, Expense, Salary, Income, returns, Due, Supplier Payment.
- Journal list marks **Auto from ledger**.

### Subscription expiry UX
- `getSubscriptionView()` → active / grace (7d) / expired / trial from `subscriptionStatus` + `subscriptionRenewsAt`.
- App banner when expired, grace, or ≤7 days left; link to Settings.
- Subscription page status card with renew CTA.
- Backend already 402s when `subscriptionEnforce` + Expired (Stage 21).


## Stage 28 — Bank reconciliation (CSV + auto-match)

- `shared/lib/bankReconcile.ts`: CSV parse (Date/Amount or Debit-Credit/Description/Reference), match engine (amount + date ±2d + reference/description score).
- UI: **Accounts & Cash → Reconcile** tab — select account, upload CSV, auto-match / confirm suggestions / create ledger entry / ignore.
- Sessions saved to `/api/bank-statements` + localStorage.
- Permissions: `finance.cashbox`, `finance.accounts`, `finance.ledgers`.


## Stage 29 — POS Pay online

- Sell checkout payment method **Online (bKash/Stripe/Sandbox)**.
- **Charge online** creates `/api/payments/intents` for that line amount.
- Sandbox: in-app confirm → marks line paid; Stripe/bKash: redirect to `checkoutUrl`.
- Completed intent id stored on sale notes (`Online:pi_…`); ledger paymentMethod mapped to Bank for online.


## Stage 30 — POS inventory sync

- `refreshProducts()` pulls `/api/products` and returns the list for immediate use.
- Multi-tab: `BroadcastChannel('bizora-inventory')` + `localStorage` ping after stock changes.
- POS (Sell): refresh on mount, every 30s while visible, on window focus / visibility.
- Checkout: refresh then validate cart qty vs server stock (including variants) before sale.
- Stock deltas still use relative `stockDelta` (offline-safe concurrent sales).


## Stage 31 — Leave balance / quota policy

- `LeavePolicy`: annual / sick / casual quotas per calendar year, optional skip weekends.
- `getStaffLeaveBalances` / `canRequestLeave` in `shared/lib/leaveBalance.ts`.
- Employees → Leave: edit policy, see remaining balances, block over-quota requests (Unpaid unlimited).
- Approve warns if over quota; policy persisted via business-settings + localStorage.


## Stage 32 — Outbound webhooks + API docs

- `dispatchWebhooks(businessId, event, data)` — HMAC-signed POST to configured URLs.
- Events on **sale.created** / **transaction.created** (transactions API) and **product.low_stock** / **product.updated**.
- `GET/PUT /api/webhooks`, `POST /api/webhooks/test` (permission `admin.settings`).
- Settings → **Webhooks** UI.
- Developer reference: `docs/API.md`.


## Stage 33 — Admin panel server-driven (less mock)

- Dashboard KPIs prefer `/api/admin/dashboard-stats` (businesses, premium, active, revenue, tickets).
- Removed cross-tenant **localStorage** reads for network sell/buy (only API fields).
- Marketing campaigns list starts **empty** (no fake campaigns).
- Security audit **download** uses real `GET /api/admin/audit-logs`.
- Platform Overview shows server `generatedAt` timestamp when available.


## Stage 34 — Realtime product inventory (Firestore)

- `subscribeBusinessProducts(businessId)` — `onSnapshot` on `businesses/{id}/products`.
- DataContext wires listener when authenticated; sets `productsRealtimeActive`.
- POS shows **Live stock** badge when snapshot is connected; falls back to poll/API if rules deny.
- Requires Firestore security rules allowing authenticated reads on the business products subcollection.


## Stage 35 — Leave carry-forward

- Policy: `carryForwardEnabled`, `carryForwardMaxAnnual` (default 5), optional sick/casual CF.
- Prior year unused **approved** Annual leave (capped) adds to current-year quota.
- Balance cards show **+N CF**; request validation uses effective quota (base + carried).


## Stage 36 — Bank recon column maps + multi-match

- **CsvColumnMap** profiles saved in localStorage (`bizora_bank_csv_maps`).
- Manual column mapping UI (Date/Amount/Debit/Credit/Description/Reference, invert signs).
- **Multi-match**: one statement line → sum of several book txs (batch deposit), shown as `matched · multi`.
- Toggle “Multi-match (batch sum)” on the Reconcile tab.


## Stage 37 — Stripe webhook signature verification

- Real HMAC-SHA256 verify of `Stripe-Signature` (`t` + `v1`) using `STRIPE_WEBHOOK_SECRET`.
- Timestamp tolerance default 300s; `timingSafeEqual` compare.
- Production rejects if secret missing; dev accepts with warning when unset.
- `express.raw` mounted on `/api/payments/webhook/stripe` before JSON parser so body bytes match Stripe’s signed payload.


## Stage 38 — Payment return completion

- `GET /api/payments/intents/:id` for status after redirect.
- `usePaymentReturn()` reads `?pay=success|cancel`, polls intent (up to ~6s), clears pending session keys.
- **Sell (POS)** marks Online payment lines paid when succeeded.
- **Online Payments** shows status banner after return.


## Stage 39 — Low stock app alerts

- `lowStockProducts` in DataContext (store-filtered, respects `minStockLevel` / variants).
- Global **rose banner** when any product is at/below minimum; link to inventory + dismiss.
- Dashboard low-stock count uses `minStockLevel` (fallback 5).


## Stage 40 — Purchase order partial receive

- PO status: `Ordered` → `Partial` → `Received` (or full receive in one step).
- `receivePurchaseOrder(poId, receivedQtys?)` increases stock only for qty received this time; tracks `item.receivedQty`.
- UI modal: per-line qty (defaults to remaining); posts Purchase ledger for received value.


## Stage 41 — Quotation convert to sale (hardened)

- Convert modal: choose Cash / Card / Bank / Mobile Wallet / Due.
- Stock validation before convert; services skipped for stock.
- Blocks double-convert and Rejected/Expired quotes.
- Available from **Accepted** or **Sent**; returns `{ ok, saleId, error }`.
- Sale reference: `Converted from quotation {quoteNumber}`; journal auto-post still applies.


## Stage 42 — Monthly leave accrual

- Policy `accrualEnabled` (default on): Annual quota = `(annualDays/12) × months elapsed` in the policy year.
- Respects `joiningDate` (accrual starts from join month within the year).
- Sick/Casual remain full-year grants; carry-forward still stacks on top of accrued Annual.
- Balance cards show `N/12 mo` and year entitlement vs accrued.


## Stage 43 — Customer credit limit (POS)

- Entity `creditLimit` (0 = unlimited). Editable on Customers add/edit form.
- POS shows available credit when a limited customer is selected.
- Checkout blocks Due/Installment if `previousDue + billDue > creditLimit`.


## Stage 44 — Staff sales targets vs actual

- `shared/lib/salesTargets.ts`: match sales by `salesperson` / `createdBy` to staff for a calendar month.
- Dashboard **Team sales targets** widget (staff with target &gt; 0).
- HR Performance tab uses same helper for monthly progress bars.
- POS already stores `salesperson` on sales for attribution.


## Stage 45 — Expense category monthly budgets

- `ExpenseCategory.monthlyBudget` (0 = no limit).
- Expense Ledger: budget bars for the current month; edit budget per category.
- Adding expense warns/confirm if projected spend exceeds category budget.
- Helper: `shared/lib/expenseBudgets.ts`.


## Stage 46 — Stock transfer (warehouses + history)

- Product Transfer: optional **from/to warehouse** when warehouses exist.
- Pre-commit **stock re-validation** via `refreshProducts`.
- Notes on transfer; ledger `Transfer` entries store line items.
- **Recent transfers** list from ledger history.


## Stage 47 — Stock transfer approval workflow

- `StockTransferRequest` statuses: Pending → Approved | Rejected | Cancelled.
- Submit request (no stock change) → Approvals tab → **Approve** moves stock + Transfer ledger, **Reject** with optional note.
- API: `GET/POST/PATCH /api/stock-transfers` (permission `inventory.transfer`).
- History tab still shows completed Transfer transactions.


## Stage 48 — Pending transfer approval alerts

- App banner when any stock transfer is **Pending** (Review → Approvals).
- Bell notification once per request id (`bizora_notified_transfers` dedupe).
- Notification target `#/transfer` opens Product Transfer.


## Stage 49 — Supplier credit limit (Purchase)

- Uses existing Entity `creditLimit` / payable balance on suppliers.
- **Buy** on **Due**: blocks checkout if `previousPayable + bill > creditLimit`.
- Footer shows limit · payable · available (OVER LIMIT when exceeded).


## Stage 50 — Customer due payment reminders

- `collectDueReminders()`: overdue installments + open Due sales.
- Amber app banner with overdue count/amount → Installments page.
- Bell notifications once per item per day (`bizora_notified_dues`).
- Installments page: **Open due (no schedule)** list.


## Stage 51 — Product expiry alerts

- `collectExpiryAlerts()`: stock &gt; 0 with `expiryDate` within 30 days (critical ≤7, expired &lt;0).
- Orange app banner + bell notifications (once/product/day).
- Set expiry on product form / batch import.


## Stage 52 — Auto reorder suggestions

- Products with stock ≤ `minStockLevel` → suggested qty to reach **2× min**.
- Purchase Orders page panel: list + estimated cost + **Create PO for all** / per-line **PO**.
- Uses product `purchasePrice` and optional `supplierId` for default supplier.


## Stage 53 — Supplier invoice matching (AP)

- Match supplier invoices → open **POs** and **Purchase** ledger rows.
- Scoring: amount (±1%), supplier name, date (±14d), reference / invoice no.
- Cashbox → **AP invoices**: CSV upload or manual entry; auto / suggested / confirm link.
- Confirm writes `matchedInvoiceId` + note on PO or purchase transaction.


## Stage 54 — Supplier payment allocation

- Pay supplier against open **Due** purchases (FIFO by date, or manual amounts).
- Reduces each purchase `dueAmount` / increases `amountPaid`.
- Payment transaction stores `details.allocations[]`.
- UI: Suppliers → Pay → **Allocate to purchases**.


## Stage 55 — Customer receipt allocation (AR)

- Due Ledger collection (**decrease** / Income) allocates cash FIFO to open sales.
- Updates sale `dueAmount` / `amountPaid`; marks installments paid when covered.
- Receipt stores `details.allocations[]`.
- Modal shows open sales preview while entering amount.


## Stage 56 — Partial payments

- `shared/lib/partialPayments.ts`: `computePaidDue`, `resolvePaymentMethod`, `ensureDueLine`, splits summary.
- **POS**: payment method is **Partial** when both paid & due &gt; 0; stores `details.paymentSplits`; **Auto-fill remainder as Due**.
- **Buy**: Cash / Due / **Partial** (enter amount paid now → rest is payable).
- Credit limits use the **due portion** only for Partial purchases/sales.


## Stage 57 — Payment split logic

- `validatePaymentSplits()`: lines must cover bill; Due needs customer; change warnings.
- `rebalanceDueLine()`: editing Cash/Card auto-adjusts Due so splits stay balanced.
- `ensureDueLine()` / `remainingToAllocate()` for add-line and auto-fill.
- POS checkout blocks on invalid splits; live status: Collected · Credit · Balanced / errors.


## Stage 58 — Payment split → account routing

- Each non-credit tender maps to a financial account type: Cash→Cash, Card/Bank/Online→Bank, Mobile→Mobile Wallet.
- On sale (and other txs with `details.paymentSplits`), balances update **per account** (not only the default account).
- POS shows live routing preview (`Cash→Main Cash · Card→Bank A/C`).


## Stage 59 — Multi-currency exchange rates

- Rates table vs USD (editable); optional **Apply on display**.
- **Base currency** = ledger/books amounts; **Display currency** may convert via FX.
- Helpers: `convertAmount`, `formatMoneyIn`, `convertCurrency`.
- Settings → Business → Exchange rates panel (common currencies).


## Stage 60 — Live exchange rate API

- Backend `GET /api/exchange-rates` (auth): Frankfurter → open.er-api.com fallback, 1h cache.
- Returns **USD-pivot** rates compatible with `convertCurrency`.
- Settings → **Refresh live rates** merges into local rate table + persists.
- Meta: provider, fetchedAt; `refreshExchangeRates()` on SettingsContext.


## Stage 61 — SaaS Revenue Dashboard + Announcement System

### Revenue Center
- Summary: total, month, refunded, **net**, payment counts.
- **12-month bar chart** + breakdown **by payment method** from live payments.
- Record / refund subscription payments (existing API).

### Announcements
- Admin tab **13b. Announcements**: create (global / business, type info|warning|success|maintenance).
- List, activate/retire, delete.
- Tenant apps still fetch active announcements via `GET /api/announcements`.


## Stage 62 — SaaS MRR dashboard + scheduled announcements

### Dashboard stats (`GET /api/admin/dashboard-stats`)
- **estimatedMRR / estimatedARR** from active tenants × plan list prices (or `monthlyFee` / `mrr` on business).
- **payingCustomers**, **ARPU**.
- Admin dashboard shows Estimated MRR card.

### Announcements
- Optional **startsAt / endsAt**; public `GET /api/announcements` only returns in-window items.
- Admin form: schedule start/end.
- Tenant app: up to 5 active banners, color by type (info/warning/success/maintenance).


## Stage 63 — SaaS churn metrics

- `shared/lib/saasChurn.ts` + `GET /api/admin/churn-metrics`
- **Logo churn** = churned / (paying + churned); **revenue churn** = lost MRR / (current + lost)
- **At-risk**: ≥2 open tickets, renew ≤14d or overdue, no login ≥30d
- Dashboard stats include `logoChurnRate`, `revenueChurnRate`, `atRisk*`, `churnedSample`
- Admin KPI cards: Logo churn % · At-risk MRR


## Stage 64 — Churn signal capture + at-risk panel

- Shop login stamps **`lastLoginAt`** (and optional IP) on the business doc.
- Status changes stamp **`suspendedAt` / `cancelledAt` / `reactivatedAt`**.
- PATCH businesses also allows `subscriptionStatus`, `subscriptionRenewsAt`, `monthlyFee`.
- Admin **Analytics Center**: logo/revenue churn KPIs, at-risk list, churned sample.


## Stage 65 — Cohorts + NRR proxy

- `computeCohorts()`: signup-month retention (active / paying / remaining MRR).
- `computeNrrProxy()`: current paying MRR ÷ (current + churned MRR); expansion vs plan list price.
- Exposed on `GET /api/admin/churn-metrics` and dashboard-stats (`nrr`, `cohorts`).
- Admin Analytics Center: NRR KPI + cohort table.


## Stage 66 — Monthly MRR snapshots + historical NRR

- `POST /api/admin/mrr-snapshots` — capture current paying MRR per tenant (one doc per `YYYY-MM`).
- `GET /api/admin/mrr-snapshots` — history + **historical NRR** between last two snapshots.
- NRR = (retained + expansion − contraction) / start MRR of earlier snapshot.
- Admin Analytics: **Capture this month** / force overwrite + snapshot list.


## Stage 67 — Auto MRR snapshot + churn CSV export

- Loading **dashboard-stats** auto-creates the current month MRR snapshot if missing (`source: auto-dashboard`).
- `GET /api/admin/churn-export` — CSV: summary, cohorts, at-risk, churned.
- Admin Analytics: **Export CSV** beside snapshot actions.


## Stage 68 — At-risk MRR alerts

- When dashboard-stats runs, if `atRiskMRR >= atRiskMrrThreshold` (default 5000), create a daily `saasAlerts` doc.
- `GET /api/admin/alerts`, `PATCH /api/admin/alerts/:id/read`
- `PATCH /api/admin/platform-settings` `{ atRiskMrrThreshold }`
- Admin banner for unread alerts + threshold control on Analytics.


## Stage 69 — Employee / customer / supplier auth hardening

- Shared `issueTokenPair` (access 15m + refresh 7d, server-side rotation) for **EMPLOYEE**, **CUSTOMER**, **SUPPLIER**.
- `lastLoginAt` on successful login for all three.
- Refresh preserves `businessId` / `permissions` for employees.
- `GET /api/auth/me` returns the correct profile per role.
- Employee PIN reset via OTP: `POST /api/auth/employee-reset-pin/request|confirm`.


## Stage 70 — RBAC route audit & hardening

- `requirePermission` treats `all` as full access; CUSTOMER/SUPPLIER denied on shop APIs.
- New **`requireAllPermissions`** (AND semantics) for sensitive multi-key actions.
- Gated: backups GET, business-settings R/W, payment intent list/get, product DELETE, FX rates (shop roles), users API → SaaS roles.
- Payment intents list uses `getActingBusinessId` for employees.


## Stage 71 — Multi-company consolidation

- Groups in `consolidationGroups` with `ownerBusinessId` + `members[]`.
- Subsidiaries linked when `businesses/{id}.parentBusinessId` = owner (or SaaS assigns members).
- `GET /api/consolidation/groups/:id/report?from&to` — combined sales / purchases / expenses / net by company.
- UI: **Consolidation** nav → create group, run report.
- Note: intercompany eliminations not applied yet.


## Stage 72 — Consolidation eliminations + weighted NCI + CSV

- Report `eliminate=1`: drop intercompany txs (flag, counterparty in group, or notes).
- `weight=1`: ownershipPct-weighted sales/purchases/expenses/net.
- `GET /api/consolidation/groups/:id/export.csv`
- UI toggles + Export CSV + IC/weighted columns.


## Stage 73 — Involuntary churn from failed payments

- Business fields: `failedPaymentCount`, `lastPaymentFailedAt`, `lastPaymentStatus`, `involuntaryChurnAt`.
- `POST /api/admin/revenue/payments/failed` logs a failed charge and increments failure streak.
- 2+ failures → `involuntaryChurnAt` + `subscriptionStatus: PastDue` (no auto-suspend).
- Successful revenue payment clears failure count.
- Refunds also count as a payment-risk signal.
- Churn at-risk reasons include failed payments; metrics expose `involuntaryChurnCount`, `paymentRiskCount`.


## Stage 74 — At-risk email digest

- `sendTransactionalEmail` via Resend (dev console fallback).
- New daily at-risk alert auto-emails SaaS owner + `saasAdmins` + `settings.alertEmails`.
- `POST /api/admin/alerts/digest` forces a digest now.
- Settings: `atRiskEmailEnabled`, `alertEmails` / `atRiskAlertEmails`, env `SAAS_ALERT_EMAILS`.
- Admin Analytics: **Email digest** button.


## Stage 75 — Stripe webhook → involuntary churn

- Shared `billingSignals.ts`: `stampPaymentFailure` / `stampPaymentSuccess` / `resolveBusinessIdFromStripeObject`.
- Stripe events:
  - Success: `checkout.session.completed`, `payment_intent.succeeded`, `invoice.paid` → clear failure streak.
  - Failure: `payment_intent.payment_failed`, `invoice.payment_failed`, `charge.failed`, … → dunning stamp + optional `revenuePayments` Failed row.
- Resolves tenant via metadata.businessId or `paymentExternalIndex`.
- Put `businessId` in Stripe Checkout/PaymentIntent metadata when creating intents.


## Stage 76 — Production readiness

- `GET /api/health/ready` — public summary (no secrets).
- `GET /api/admin/readiness` — full checklist + Firestore ping.
- `DEPLOY.md` — env, Firebase, TLS, payments, smoke tests.
- Admin Analytics: **Prod readiness** button.


## Stage 77 — Unit tests (core libs)

- `shared/lib/saasChurn.test.ts` — plan MRR, at-risk, NRR snapshots
- `shared/lib/partialPayments.test.ts` — splits, due rebalance, tender accounts
- `backend/src/lib/readiness.test.ts` — JWT / OTP_DEV_ECHO / env gates
- Run: `npm test` (tsx + node:test)


## Stage 78 — Advanced manufacturing

- `GET /api/production/mrp?bomId&qty` — material requirements vs on-hand, shortages, est. cost.
- `POST /api/production/complete` — atomic consume RM, receive FG, scrap/actual qty, labor cost, batch Completed.
- `POST /api/production/batches` — create planned batch with work center.
- Work centers CRUD under `/api/production/work-centers`.
- Production UI: MRP preview on batch form, complete modal (good/scrap/labor).


## Stage 79 — Multi-level BOM explosion

- `shared/lib/bomExplosion.ts` — recursive explode with yield, cycle detection, leaf aggregation.
- MRP + production complete consume **exploded raw leaves** (not only top-level lines).
- `GET /api/production/explode?bomId&qty` — tree levels + leaves.
- BOM lines: `componentType: 'raw' | 'subassembly'` (auto when line id matches another BOM product).
- Recipe UI: pick sub-assemblies from products that already have a BOM.


## Stage 80 — Work-center capacity planning

- `buildCapacitySchedule` — daily load vs `capacityPerDay` (units or hours).
- `GET /api/production/capacity?from&to` — schedule + overload + next free day hints.
- Batches: `workCenter` / `hoursRequired`; work centers: `capacityUnit`.
- Production UI **Capacity** tab — 14-day heat strip per center.


## Stage 81 — Production routing (operations)

- `productionRoutes/{productId}` with ordered `steps[]` (seq, name, workCenterId, standardHours).
- New batches **snapshot** route steps as `operations[]`.
- `POST /api/production/batches/:id/operations/:seq/complete` — sequential step complete.
- Batch **Complete** blocked while operations pending (unless `force`).
- Production UI: operation chips on batches + Routing tab (API example).


## Stage 82 — QC inspection gate

- `POST /api/production/batches/:id/qc` — pass / fail / hold with inspected & rejected qty.
- Route steps: `isQc: true` (or name matches QC/Inspect) → batch `requireQc`.
- Complete blocked until QC **pass** (409); **fail** blocks unless force.
- Complete modal: QC result + rejected qty; posts QC then complete.


## Stage 83 — Production cost variance

- `computeCostVariance` — material/labor/total standard vs actual.
- On batch complete: stores `costVariance`, standard material/labor costs.
- Labor standard: sum(route standardHours) × qty × laborRate (`DEFAULT_LABOR_RATE` or body).
- `GET /api/production/cost-variance?from&to` — report + summary.
- Production UI **Cost variance** tab.


## Stage 84 — Standard cost freeze + scrap reasons

- On **batch create**: multi-level explosion freezes `standardMaterialCost`, `standardLaborCost`, `standardLeaves`.
- On **complete**: variance uses frozen standards (labor scaled if actual qty ≠ planned).
- Scrap: `scrapReason` / `scrapReasons[]`; `GET /api/production/scrap-reasons`.
- Complete modal: scrap reason dropdown.


## Stage 85 — Alternate BOMs

- BOM fields: `name`, `code`, `isDefault`, `revision`.
- Sub-assembly explosion prefers **default** BOM per product.
- `GET /api/production/boms/by-product/:productId` — list alternates.
- `POST /api/production/boms/:id/set-default` — set default (clears siblings).
- Recipe UI: name/code/default checkbox; list shows Default badge.


## Stage 86 — Auto-schedule from capacity

- Batch create with `workCenterId` + `autoSchedule` (default on) picks first day with free capacity.
- Horizon: `scheduleHorizonDays` (default 28, max 90).
- Response: `autoScheduled`, `scheduleNote`.
- `GET /api/production/schedule-suggest?workCenterId&qty&hoursRequired&from`
- Hours load from routing `standardHours` when not provided.


## Stage 87 — Production WIP dashboard

- `GET /api/production/wip` — counts (planned, in progress, overdue, QC hold/fail, ops pending), capacity alerts (7d), aging open batches.
- Production UI **WIP** tab.


## Stage 88 — Material reservations (planned batches)

- Open batches reserve materials via `reservations` / `standardLeaves`.
- MRP is **reservation-aware**: available = onHand − reserved (other batches).
- `GET /api/production/reservations` — committed stock by material.
- `POST /api/production/batches/:id/cancel` — cancel + release reservation.
- Complete clears reservations after consumption.


## Stage 89 — Batch / lot expiry dates

- Production batches: `expiryDate`, `lotNumber`, `shelfLifeDays`.
- Create: set expiry or compute from shelf life + start date.
- Complete: stamps FG product `expiryDate` + `batchNumber` (lot).
- `GET /api/production/expiring?withinDays=30` — batches + products nearing expiry.
- WIP summary includes `expiringSoon`.


## Stage 90 — FEFO lot allocation

- `shared/lib/fefo.ts` — sort/allocate/upsert lots by earliest expiry; skip expired by default.
- Production complete **upserts** `product.lots[]` with lot qty + expiry.
- `GET /api/fefo/preview?productId&qty` — suggested pick lines.
- `POST /api/fefo/allocate` — `{ productId, qty, commit?: true }` reduces lots + stock.


## Stage 91 — POS FEFO stock deduction

- `updateProductStock(..., 'decrease')` applies local FEFO on `product.lots` (or synthetic lot).
- Online: `POST /api/fefo/allocate` with `commit: true` (fallback to `stockDelta` on failure).
- Offline: local lots adjusted + existing offline `stockDelta` queue.
- Variants unchanged (no lot matrix yet).


## Stage 92 — Sale line FEFO lot attribution

- `InvoiceItem.lots[]` + primary `batchNumber` / `expiryDate` from FEFO pick.
- `updateProductStock` returns allocated lot lines.
- POS Sell and quotation→sale attach lots onto the Sale transaction items for traceability.


## Stage 93 — Purchase receive → FEFO lots

- `processPurchase` upserts `product.lots` (lot number + optional expiry + receivedAt).
- Buy cart: expiry modal includes **Lot number**; purchase lines store `batchNumber` + `lots[]`.
- PO receive uses `processPurchase` with lot derived from PO number.
- Server product PATCH accepts `lots` alongside `stockDelta`.


## Stage 94 — Sales return restores FEFO lots

- `updateProductStock(..., 'increase', opts)` upserts returned qty into `product.lots`.
- Sales Return uses original sale `item.lots` (proportional if partial return).
- Fallback lot `RETURN` / sale `batchNumber` when sale had no lot lines.
- Return transaction lines carry restored `lots` for audit.


## Stage 95 — Purchase Return (FEFO)

- New page `/purchase-return` — select supplier purchase, return qty, refund method.
- Stock deduction via existing FEFO `updateProductStock(..., 'decrease')`.
- Return lines keep lot audit from original purchase `lots` / `batchNumber`.


## Stage 96 — Invoice lot / batch display

- Invoice templates show FEFO `lots[]` (or batchNumber + expiry) under each line.
- Format: `LOT-A×5 (exp 2026-04-01) · LOT-B×7`
- Purchase invoices navigate to Purchase Return from the return action.


## Stage 97 — Lot Enquiry report

- Page `/lots` — all product lots with qty, expiry, status (expired / critical / warning / ok).
- Sorted FEFO (earliest expiry first); search + status filter.
- Synthetic DEFAULT lot when product has stock but no `lots[]`.


## Stage 98 — Lot quantity adjustment

- `POST /api/fefo/adjust` — set absolute qty or delta for a lot; removes lot at 0; creates lot if needed.
- Reasons: count, damage, expired, correction, other (audit log).
- Lot Enquiry: pencil action opens adjust modal; refreshes products after save.
- Product `stock` recalculated from lot sum when lots exist.


## Stage 99 — Lot Enquiry CSV export

- Lot Enquiry **Export CSV** downloads filtered rows (product, lot, qty, expiry, status).
- Filename: `lot-enquiry-YYYY-MM-DD.csv`.


## Stage 100 — Lot adjust → Stock Adjustment ledger

- `POST /api/fefo/adjust` creates a `Stock Adjustment` transaction when qty changes.
- Line includes lot number, direction (in/out), unit cost from product.
- Visible in Stock Report / ledgers for audit.


## Stage 101 — Bulk expired lot write-off

- `POST /api/fefo/write-off-expired` — zero lots with expiry &lt; asOf; Stock Adjustment per product.
- Lot Enquiry shows **Write off expired (N)** when expired lines exist.


## Stage 102 — Purchase Return deep-link

- Invoice **Return** on a Purchase navigates to `/purchase-return` with `state.invoiceId`.
- Purchase Return auto-selects that purchase (same pattern as Sales Return).


## Stage 103 — Lot movement history

- `GET /api/fefo/movements?lotNumber&productId` — sales, purchases, returns, adjustments for a lot.
- Lot Enquiry: click lot number → movement panel (qty in/out by transaction).


## Stage 104 — Store transfer FEFO lots

- Approve stock transfer: source **FEFO decrease**, destination **same lots** restored.
- New dest product copies transferred lots / batch / expiry.
- Transfer ledger lines include `lots[]` for audit.


## Stage 105 — POS near-expiry warning

- Cart simulates FEFO pick; flags lots expiring within 30 days (critical ≤7, expired).
- Checkout banner + confirm dialog before completing the sale.


## Stage 106 — FEFO policy settings

- Business settings: `fefoWarnDays` (default 30), `fefoCriticalDays` (7), `fefoBlockExpired`.
- POS uses these for cart alerts; block mode aborts checkout when expired lots are required.


## Stage 107 — Dashboard lot expiry strip

- Dashboard shows expired / ≤7d / ≤30d lot counts when any need attention.
- Click opens `/lots` (Lot Enquiry).


## Stage 108 — Stock Report lot count

- All Products table shows active **Lots** count per product.
- Click opens Lot Enquiry (`/lots`).


## Stage 109 — Lot Enquiry URL filters

- `/lots?q=...&status=expired|critical|warning|ok` — search + status from query string.
- Dashboard expiry badges deep-link to matching status.
- Stock Report lot badge opens enquiry filtered by product name.


## Stage 110 — Dashboard respects FEFO policy

- Lot expiry strip uses `settings.fefoWarnDays` / `fefoCriticalDays` (defaults 30 / 7).
- Badge labels show the configured windows.


## Stage 111 — Lot Enquiry uses FEFO policy

- Status bands (critical / warning) follow `fefoCriticalDays` / `fefoWarnDays`.
- Filter dropdown labels show configured windows.


## Stage 112 — Product List lot expiry badges

- List/grid views show worst lot status (Expired / Exp Nd) using FEFO policy.
- Click badge → Lot Enquiry filtered by product name.


## Stage 113 — Product List expiry filter

- Filter: All / Expired / Critical / Warning / No near expiry (FEFO policy windows).
- Combines with category + search.


## Stage 114 — Product CSV lot columns

- Export adds `LotCount`, `EarliestLotExpiry`, `LotNumbers` (pipe-separated).
- Respects current list filters (search, category, expiry).


## Stage 115 — Product CSV import lots

- Import accepts `LotNumbers` (pipe/comma-separated), `EarliestLotExpiry`, `BatchNumber`, `ExpiryDate`.
- Builds `product.lots[]` (even split of stock across named lots, or single lot from batch/expiry).


## Stage 116 — Shared FEFO policy helper

- `shared/lib/fefoPolicy.ts` — `policyFromSettings`, `daysUntilExpiry`, `statusFromDays`, `worstLotStatus`, `lotsFromProduct`.
- Lot Enquiry uses the shared helper (single source of truth for status bands).


## Stage 117 — FEFO policy adopted app-wide

- Product List, Dashboard, POS Sell all use `shared/lib/fefoPolicy`.
- Product expiry filter matches `status` from `worstLotStatus`.


## Stage 118 — FEFO policy unit tests

- `shared/lib/fefoPolicy.test.ts` — policy defaults, day delta, status bands, worst lot, product lot synthesis.


## Stage 119 — Production scrap analytics

- `GET /api/production/scrap-analytics?from&to` — totals, by reason, by product (rate), by work center, recent batches.
- Production UI **Scrap** tab.


## Stage 120 — Phantom BOM components

- `componentType: 'phantom'` — explode children into raw leaves; not a stocked intermediate.
- Recipe UI: Raw / Sub-assembly / **Phantom** per line; pick products that have a BOM.
- Tests: phantom explosion multiplies leaf qty correctly.


## Stage 121 — Operation labor time booking

- Complete op: body `actualHours` (defaults to standardHours).
- Stores `actualHours`, `hoursVariance` per op; batch `totalActualHours` / `suggestedLaborCost`.
- Batch complete uses suggested labor from actual hours × rate when laborCost omitted.
- UI prompts for actual hours when marking a step done.


## Stage 122 — Labor efficiency report

- `GET /api/production/labor-efficiency` — std vs actual hours, efficiency, by center/product, slow ops (≥20% over).
- Production **Labor** tab.


## Stage 123 — Alternate production routing

- Multiple routes per product (`name`, `code`, `isDefault`, `steps`).
- `POST /api/production/routes` create alternate; `PUT /api/production/routes/:id` update.
- Batch create accepts `routeId` (else default route for product).
- Production **Routing** tab + batch route selector.


## Stage 124 — Scrap & labor CSV export

- Production **Scrap** tab → Export CSV (summary, by reason/product/center, recent batches).
- Production **Labor** tab → Export CSV (summary, by center/product, slow ops).


## Stage 125 — Route comparison

- `GET /api/production/route-compare?productId=` — steps, std hours, QC count, delta vs default.
- Production **Routing** tab: Compare panel for alternate routes.


## Stage 126 — Shop-floor board

- `GET /api/production/shop-floor` — jobs by work center, next pending op, today utilization.
- Production **Shop floor** tab (Kanban-style center cards).


## Stage 127 — Shop-floor complete actions

- Shop floor job cards: **Done** on next op (books actual hours, refreshes board).
- When all ops done: **Complete batch** opens existing complete modal.


## Stage 128 — Shop-floor Start batch

- Planned jobs on the board show **Start** → status In Progress + board refresh.
- In Progress keeps **Done** / **Complete batch** actions.


## Stage 129 — Warehouse-scoped FEFO lots

- `FefoLot.warehouseId` optional; allocate/upsert respect warehouse scope.
- Product `warehouseId` used when decreasing stock; out-of-scope lots preserved.
- Lot Enquiry shows Warehouse column.


## Stage 130 — E-commerce storefront integration

- Public: `GET /api/storefront/:slug/catalog`, `POST /api/storefront/:slug/orders`.
- Auth: `POST /api/storefront/fulfill` (Sale + FEFO), `GET|PUT /api/storefront/settings` (API key).
- Online Shop: Fulfill button, storefront API docs + key, online product count.


## Stage 131 — Storefront templates + domain deploy

- 5 ready themes (Minimal, Boutique, Fresh Mart, Tech Hub, Classic).
- Online Shop **Website** tab: pick template, subdomain or custom domain, publish.
- Public pages `/s/:slug` and `/store/:slug` — catalog from POS (sellOnline), place order → app Orders.
- Layout hides chrome on public storefront routes.


## Stage 132 — Storefront payment + order ops

- Checkout: COD / bKash / Nagad / Online payment method on public store.
- Orders store `paymentMethod` + `paymentStatus`; shown in Online Shop.
- Orders tab: pending badge, Refresh; Website: bulk enable Sell online.


## Stage 133 — Fully independent online store

- No Shopify/WooCommerce required; platform default `Bizora`.
- Public order tracking: `GET /api/storefront/:slug/orders/track`.
- Storefront UI: Track order; independence messaging in Online Shop.
- Catalog, themes, subdomain, orders, FEFO fulfill — all first-party.


## Stage 134 — Courier integration

- Providers: Manual (own delivery), Steadfast (live API when keys set), Pathao, RedX, Paperfly, Sundarban.
- `POST /api/couriers/ship` — tracking number + order status Shipped.
- Online Shop: **Ship** on orders; save courier settings to server.


## Stage 135 — Delivery status tracking

- Pipeline: Pending → Processing → PickedUp → InTransit → OutForDelivery → Delivered (+ Failed/Returned).
- `POST /api/couriers/delivery-status` — timeline on order.
- Customer track shows delivery timeline; Online Shop **Delivery status** control.


## Stage 136 — Steadfast live status sync

- `steadfastFetchStatus` via tracking / invoice / consignment id.
- `POST /api/couriers/sync-status` updates `deliveryStatus` + timeline.
- Online Shop: **Sync courier** on Steadfast shipments.


## Stage 137 — Pathao OAuth + live create order

- OAuth `issue-token` + `POST /aladdin/api/v1/orders`.
- Courier settings: username, password, store_id; **Test Pathao auth**.
- Ship via Pathao uses live API when credentials + store_id set.


## Stage 138 — RedX create + track

- Live `POST /parcel` when JWT token set; local tracking fallback.
- `redxFetchStatus` via `GET /parcel/track/{id}`; sync-status supports RedX.
- Settings: Area ID, pickup store ID, base URL (sandbox/live).


## Stage 139 — Courier webhooks

- `POST /api/couriers/webhook/:provider/:businessId` — Steadfast / RedX / Pathao status push.
- Optional `x-webhook-secret` (storefront API key).
- `GET /api/couriers/webhook-info` — copy endpoint URLs in Online Shop.


## Stage 140 — Pathao status sync

- `pathaoFetchStatus` via OAuth + GET order by consignment id.
- `POST /api/couriers/sync-status` supports Pathao alongside Steadfast and RedX.


## Stage 141 — Paperfly adapter

- Create via merchant NewOrder when key + username + password set; local fallback.
- Webhook path `paperfly` + webhook-info URL.
- Courier settings UI fields for Paperfly.


## Stage 142 — GitHub Actions CI

- `.github/workflows/ci.yml`: test + build backend/frontend/admin on push/PR.
- Node 20, npm workspaces; documented in DEPLOY.md.


## Stage 143 — Variant-level FEFO lots

- `ProductVariant.lots[]` with same FEFO allocate/upsert as product lots.
- `updateProductStock(..., variantId)` uses variant lot register.
- Lot Enquiry lists variant lots as `Product · Variant`.


## Stage 144 — Variant lots visibility

- `lotsFromProduct` merges product + variant lots for expiry badges / worst status.
- ProductList CSV includes `VariantLots` column; new variants init with lots[].


## Stage 145 — Buy receive into variant lots

- `processPurchase` accepts `variantId` and upserts FEFO lots on that variant.
- Buy cart: pick variant when product has variants; lot/expiry via Exp control.


## Stage 146 — POS variant near-expiry warnings

- Cart FEFO alerts use variant lots when `variantId` is set.
- Adding a variant confirms if FEFO head is warning/critical/expired; blocks expired when policy says so.


## Stage 147 — Transfer + invoice variant/lot traceability

- Stock transfer requests can target a variant; approve uses FEFO on that variant.
- Invoice ItemExtras shows multi-lot lines and variant label when present.


## Stage 148 — Sales return variant lot restore

- Return qty keyed per line (product + variant).
- Restock calls `updateProductStock(..., variantId)` with original FEFO lots.


## Stage 149 — Partial sales returns

- shared/lib/partialSalesReturn.ts: remaining qty, proportional refund, lot slice.
- Sales Return: Sold/Left columns; prior returns cap; RET-{saleId} link.


## Stage 150 — Partial purchase returns

- Reuses remainingReturnable / sliceLotsForQty / calculatePartialRefund.
- `isReturnForPurchase` + `PRET-{purchaseId}` linking.
- Purchase Return UI: Left qty, prior-return banner, line keys with variant.


## Stage 151 — Partial return discount/tax share

- `calculatePartialRefundWithAdjustments`: proportional discount & tax by line-subtotal ratio.
- Sales Return & Purchase Return show breakdown and store shares on return tx.


## Stage 152 — Sales return store credit / adjust due

- Refund methods: Store Credit → `walletBalance`; Adjust Due → reduce `currentDue`.
- Customer resolved via entityId, mobile, or name.


## Stage 153 — POS store credit UX

- Shows customer wallet balance when selected.
- **Apply** fills a Store Credit payment line up to remaining bill.


## Stage 154 — Customer wallet adjust + history

- Customer detail: + Credit / − Debit store credit with note.
- Last 50 movements in `walletHistory` on entity; last 8 shown in UI.


## Stage 155 — Wallet history from POS & returns

- `shared/lib/walletHistory.ts`: appendWalletHistory / applyWalletDelta.
- Sales return (store credit), POS debit, and manual adjust all write walletHistory.


## Stage 156 — Store credit liability on reports

- Balance sheet / trial balance include unredeemed customer wallet as liability.
- Financial report lists top store-credit holders.


## Stage 157 — Store credit liability CSV export

- Financial report: export CustomerId, Name, WalletBalance + TOTAL row.


## Stage 158 — Customer statement CSV

- Customer detail: Statement CSV with due, store credit, txs, wallet history.


## Stage 159 — Stock adjust with FEFO / lots

- Stock Report bulk modal: Increase (lot + expiry) or Decrease (FEFO).
- Adjustment ledger lines store lots / batchNumber.


## Stage 160 — Stock take (physical count)

- Stock Report tab: enter counted qty vs system; post variances.
- Positive variance increases stock; negative uses FEFO decrease.
- Ledger reference `Stock Take`.


## Stage 161 — Stock take CSV sheet

- Export ProductId, SKU, Name, SystemStock, CountedQty.
- Import fills CountedQty (match by id or SKU).
- Stock Take tab UI restored with export/import/post.


## Stage 162 — Stock take history

- History filter: Stock Take.
- Stock Take tab lists recent sessions (lines, over/under, value).


## Stage 163 — Double-entry journaling

- Expanded COA: Store Credit Liability, Other Income; COGS on sale/return.
- `validateJournalLines` + auto-post stock take / store credit / COGS.
- Sales attach product cost for COGS; Reports trial balance prefers journal when posted.


## Stage 164 — Journal backfill + CSV

- Backfill: buildAutoJournalEntry for each ledger tx missing a journal.
- Export journal lines CSV (entry, account, debit, credit).


## Stage 165 — Account general ledger

- Journal tab Account ledger with running balance.
- Trial balance row click opens that account.


## Stage 166 — Journal P&L and Balance Sheet

- `journalStatements.ts`: buildPnL / buildBalanceSheet from posted journals.
- Journal → Statements tab with optional date range.


## Stage 167 — Journal period lock

- `journalPeriodClosedThrough` blocks posts on or before the date (manual + auto).
- Journal UI: set / unlock closed-through date (localStorage).


## Stage 168 — Opening balance journal

- Journal → Opening: enter BS accounts; Owner Equity auto-plug to balance.


## Stage 169 — Journal reversal

- Undo on each entry posts opposite Dr/Cr lines (REV- reference).
- Delete blocked with guidance when period is locked.


## Stage 170 — Journal entry filters

- Entries tab: All / Auto / Manual + search (memo, ref, account).


## Stage 171 — Bank recon → journal adjust

- Unmatched statement line: **Post journal** (Bank ↔ OpEx or Other Income).
- Respects journal period lock via addJournalEntry.


## Stage 172 — Batch journal from bank recon

- **Journal all open** posts Bank↔OpEx/Other Income for every unmatched/suggested line.


## Stage 173 — Statement CSV export

- Journal Statements: export P&L and Balance Sheet CSV.


## Stage 174 — Docker Compose deploy

- `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile` + nginx SPA proxy.
- DEPLOY.md section 7.


## Stage 175 — Docker healthcheck + admin

- API healthcheck via `/api/health`; web waits until healthy.
- Admin image + `--profile full` on port 8081.
- Root `.dockerignore`.


## Stage 176 — CI Docker build + Makefile

- GitHub Actions job builds api/web/admin images.
- Makefile: `make up`, `make up-full`, `make docker-build`.


## Stage 177 — Docker smoke script

- `scripts/smoke-docker.sh` hits `/api/health`, `/api/health/ready`, web `/`.
- `make smoke`


## Stage 178 — Production OTP hard-fail

- API refuses to start if `NODE_ENV=production` and `OTP_DEV_ECHO=true` or weak `OTP_PEPPER`.


## Stage 179 — Subscription expiry UX

- Banner Renew → `/subscription`.
- When `subscriptionEnforce` + expired: full-screen block (except subscription page).
- Unit tests for active / grace / expired phases.


## Stage 180 — SaaS enforce subscription lock

- PATCH businesses accepts `subscriptionEnforce`.
- Admin edit: Expiry date + Enforce expiry lock checkbox; saved to backend.


## Stage 181 — Login/me subscription fields

- `withSubscriptionFields` normalizes plan, status, renewsAt, enforce on login/register/me.


## Stage 182 — Subscription page lock notice

- Shows when platform admin enabled `subscriptionEnforce`.


## Stage 183 — Churn metrics refresh

- Analytics: Refresh metrics loads `/api/admin/churn-metrics` into dashboard stats.


## Stage 184 — At-risk CSV export

- Analytics: export at-risk businesses (id, plan, MRR, reasons).


## Stage 185 — At-risk open business editor

- Click at-risk row → business edit modal (set enforce, expiry, plan).


## Stage 186 — Announcement endsAt on banner

- Shop banner shows schedule end time when `endsAt` is set.


## Stage 187 — Serial units + lot link

- `shared/lib/serialUnits.ts`: normalize, allocate (FIFO / preferred lot), restore.
- Product form: lines as `LOT:SERIAL` or plain serial → `serialUnits`.


## Stage 188 — Sales return restores serials

- Restock path: restoreSerials by line serials / saleId → available again.


## Stage 189 — Serial enquiry (Stock Report)

- Stock Report → Serials tab: search by serial / lot / product, status badges.


## Stage 190 — Serial enquiry CSV

- Stock Report → Serials → Export CSV (filtered rows).


## Stage 191 — Purchase receive → serialUnits

- Buy SN modal serials merge into product serialUnits with lot link.


## Stage 192 — UX flow polish

- Nav: Sales Return label; Journal under Finance.
- HashRouter links `#/subscription`, `#/products`.
- SaaS menu: single Analytics Center entry.
- Dashboard guided chips: Sell → Buy → Stock → Journal.


## Stage 193 — Mobile nav + empty guidance

- Bottom nav: Sell, Buy, Stock, Cash (+ Home / Quick Sale FAB / Menu).
- Journal empty state: how to start (sale/buy, backfill, opening).


## Stage 194 — Header page hints

- Desktop header shows one-line tip per main route (Sell, Buy, Stock, Journal…).


## Stage 195 — Mobile header page title + hint

- Mobile top bar shows current page name and one-line tip (not only Bizora logo).


## Stage 196 — Bengali page hints

- Header tips switch to Bangla when language is `bn`.


## Stage 197 — BN guided chips + journal tips

- Dashboard flow chips and Journal empty tips follow language `bn`.


## Stage 198 — BN nav short labels

- Bengali: Sell/Buy/Stock/Cash/Menu and common nav keys shortened for mobile.


## Stage 199 — POS empty cart BN

- Sell cart empty message in Bengali when language is bn.


## Stage 200 — Buy empty cart BN

- Purchase cart empty message in Bengali.


## Stage 201 — Stock serials empty BN

- Serial enquiry empty state in Bengali.


## Stage 202 — Offline banner BN

- Offline / queue / conflict / sync button messages in Bengali.


## Stage 203 — Subscription banner BN

- Expiry / grace / renew banner and lock overlay in Bengali.


## Stage 204 — Alert banners BN

- Expiry, due, transfer pending banners + buttons in Bengali.


## Stage 205 — Low stock banner BN

- Low stock alert text and buttons in Bengali.


## Stage 206 — Impersonation banner BN

- SaaS login-as banner text and exit button in Bengali.


## Stage 207 — POS keyboard shortcuts

- **F2** focus product search; **F9** confirm sale (clicks checkout when enabled).


## Stage 208 — POS shortcut chips

- Visible F2 / Enter / F9 hint row under product search (EN + BN).


## Stage 209 — POS Escape shortcut

- **Esc**: close barcode scanner, or clear search and refocus.


## Stage 210 — Quick Sale keyboard

- Digits / operators from keyboard; Enter or F9 charge; Esc clear; BN labels.


## Stage 211 — Buy F2/Esc search shortcuts

- Purchase screen: F2 focus search, Esc clear; EN/BN hint chips.


## Stage 212 — Training keyboard cheat sheet

- App Training documents F2 / Enter / F9 / Esc across Sell, Buy, Quick Sale.


## Stage 213 — Stock serials F2 search

- Serials tab: F2 focus enquiry search, Esc clear.


## Stage 214 — POS double-checkout guard

- F9 / Confirm Sale ignored while a checkout is already in progress.


## Stage 215 — Quick Sale charge guard

- Enter/F9 charge ignored while a charge is already in progress.


## Stage 216 — Buy purchase guard

- Confirm Purchase ignored while finalize is already running.


## Stage 217 — Sales return process guard

- Process return ignored while already in flight.


## Stage 218 — Purchase return process guard

- Purchase return process ignored while already in flight.


## Stage 219 — Sell checkout busy UI

- Confirm Sale shows Processing… and stays disabled while checkout runs.


## Stage 220 — Buy / Quick Sale busy UI

- Confirm Purchase and Charge show Processing… while in flight.


## Stage 221 — Return screens busy UI

- Sales/Purchase return process buttons show Processing… while in flight.


## Stage 222 — Transfer approve guard + busy

- Stock transfer approve: in-flight guard and Processing… button label.


## Stage 223 — Transfer submit guard + busy

- Create transfer request: in-flight guard and Processing… on submit button.


## Stage 224 — Journal post guard + busy

- Manual Post journal entry: in-flight guard and Processing… label.


## Stage 225 — Journal backfill guard + busy

- Backfill button: in-flight guard, spin icon, Processing… label, BN alert.


## Stage 226 — Journal opening post guard

- Opening balances post: in-flight guard + Processing… button.


## Stage 227 — Journal reverse guard

- Reverse entry: in-flight guard, spin on undo icon, BN confirm.


## Stage 228 — POS auto-refocus search after sale

- After successful checkout, product search gains focus for the next scan.


## Stage 229 — Buy auto-refocus search after purchase

- After successful purchase, product search focuses for the next receive.


## Stage 230 — Esc closes POS invoice

- Escape closes invoice modal and refocuses product search; F9 ignored while invoice open.


## Stage 231 — Buy Esc closes invoice

- Escape closes purchase invoice and refocuses product search.


## Stage 232 — VAT report

- `shared/lib/vatReport.ts`: output/input lines, returns, net payable, CSV.
- Reports → Tax & VAT: period filter, line tables, BN labels, CSV download.
- Sales/Purchase returns adjust VAT totals.


## Stage 233 — VAT period: this month

- Reports filter default **This month**; calendar year for This year; BN labels.


## Stage 234 — VAT report shows default tax rate

- Tax & VAT header: business taxRate % + warning when rate is 0.


## Stage 235 — VAT report print

- Tax & VAT: Print opens summary + line tables for browser print dialog.


## Stage 236 — VAT zero-rate Settings link

- Warning on Tax & VAT when rate is 0 links to Settings.


## Stage 237 — VAT docs + page hint

- Header tip for Reports; SCREEN_FLOWS VAT section.


## Stage 238 — Expense VAT → input tax

- Expense modal: optional VAT field; amount stored net+tax with details.tax.
- VAT report includes Expense lines with tax as input VAT.


## Stage 239 — Fix frontend crash + admin nav

- Import collectExpiryAlerts / dueReminders in App.tsx (fixes white screen).
- Remove duplicate BN translation keys (Menu, Accounts & Cash, Online Shop).
- Restore AdminPanel left module navigation sidebar.


## Stage 240 — Fix missing sidebar components

- Admin: requests / templates / logs modules in nav; mobile module strip; flex layout.
- Frontend: Building icon in main lucide import (HR Structure sidebar).


## Stage 241 — SaaS login only on Admin portal

- Shop client: no SaaS tab; login skips saas-login API; link to Admin portal.
- Admin app: dedicated dark AdminAuth design; allowSaas: true.


## Stage 242 — Invalid credentials error handling

- login() returns empty_fields / invalid_credentials.
- Shop Auth: inline loginError banner (no alert); 2FA errors inline.
- AdminAuth: validation + specific network/credential messages; role=alert.


## Stage 243 — Login rate limiting

- Backend: IP+identifier limiter (default 8 fails / 15 min lock).
- Routes: /login, /saas-login, /customer-login.
- 429 too_many_attempts + remainingAttempts on 401.
- Shop & Admin UI show lock / remaining attempts.


## Stage 244 — Signup trial package limits

- Default trial on register: products 5, customers 3, buys 5, sells 10, expenses 5, quickSales 20.
- Any limit reached → subscriptionStatus Expired + enforce.
- SaaS: PATCH trial-limits / businesses allowedFields include trialLimits.
- Subscription page shows trial usage bars.


## Stage 245 — Trial usage tracking logic

- `trialUsageTrack`: events, session write, derive/merge from data.
- `PATCH /api/auth/trial-usage` persists counters + auto-expire.
- DataContext: stale-safe record via localStorage session; reconcile helper.
- updateUser mirrors trialUsage to registeredUsers + backend.


## Stage 246 — Trial usage analytics

- `computeTrialUsageAnalytics`: platform-wide trial pressure, metric avgs, near-limit list.
- Included in GET /api/admin/dashboard-stats as trialUsageAnalytics.
- Admin Analytics Center shows live trial usage cards.


## Stage 247 — Cloud-first backup + multi-device safety

- `backupSync`: cloud priority, local fallback, deviceId, revision, contentHash, conflict detect.
- Backend backups store meta; GET /latest-meta.
- Settings: runPriorityBackup; restore warns on multi-device conflict.


## Stage 248 — Online flush of pending backups

- Pending flag when cloud fails / offline.
- `flushPendingCloudBackup` + `useBackupOnlineSync` (online + visibility).
- Tab hide → quiet local snapshot.


## Stage 249 — Backup encryption (AES-256-GCM)

- Client-side AES-256-GCM + PBKDF2-SHA256 (150k).
- Optional passphrase in Settings; never sent as plaintext.
- Restore prompts for passphrase when blob encrypted.


## Stage 250 — Server at-rest backup encryption

- AES-256-GCM via BACKUP_AT_REST_KEY on POST /api/backups.
- Decrypt on GET /api/backups/:id for authorized restore.
- Works with optional client AES-GCM (double protection).


## Stage 251 — Backup integrity verification

- verifyBackupIntegrity() checks contentHash before restore.
- Settings: Verify local backup integrity button.


## Stage 252 — Single React instance (invalid hook call)

- Vite `resolve.dedupe` + alias for `react` / `react-dom`.
- Root `overrides` so workspaces share one React.
- Fixes SettingsProvider useState null dispatcher + false "useAuth outside provider".


## Stage 253 — Trial status banner after signup

- `TrialStatusBanner` shows remaining trial quotas on Dashboard.
- Signup success alert lists default trial package limits.
- Backend register already persists trialLimits / trialUsage.


## Stage 254 — SaaS trial limit overrides

- Admin business edit: trial package limit inputs, extend days, reset usage, boost preset.
- Saves via PATCH `/api/admin/businesses/:id/trial-limits`.


## Stage 255 — Live trial/subscription session refresh

- `refreshSessionFromServer()` calls GET `/api/auth/me` and merges trialLimits, trialUsage, subscription fields.
- Runs on tab focus, visibility, and every 60s so SaaS limit boosts apply without re-login.


## Stage 256 — WebSocket real-time business sync

- Socket.IO rooms: `business:{id}`, `user:{id}`, `saas-staff`.
- Events: `sync:hello`, `sync:business`, `sync:ping`, existing `chat:*`.
- SaaS trial-limits + shop trial-usage broadcast `domain: trial`.
- Client `realtimeSocket` + Auth refreshes session on trial/subscription events.


## Stage 257 — SaaS live tickets + Sync now

- `refreshSaasTickets()` in DataContext; Admin live reload includes tickets/support domain.
- Ticket updates emit `sync:business` domain `tickets` for SaaS staff.
- Admin sidebar **Sync now** forces full data pull + socket reconnect attempt.


## Stage 258 — Multi-tenant business context hardening

- `getActingBusinessId`: SAAS_OWNER/ADMIN return **null** (no accidental `saas-owner` tenant path).
- `requireBusinessContext` / `requireBusinessId` middleware for tenant routes.
- `simpleCrudRouter` + products/warehouses/entities/webhooks require business context.
- Vitest: `businessContext.test.ts`.


## Stage 259 — Tenant context rollout

- `requireBusinessContext` on remaining shop data routers: backups, businessSettings, couriers, fefo, giftCards, payments, payroll, productionOps, staff, transactions, accounting, hrm, kitchenOrders, manufacturing, purchaseOrders, quotations, stockTransfers, storefront, support, bankReconcile, twoFactor, consolidation.
- Replaced `getActingBusinessId() || user.id` unsafe SaaS fallback.


## Stage 260 — Impersonation hardening

- Impersonate requires support **reason** (min 5 chars); TTL default **15m** (`IMPERSONATE_TTL`).
- Audit log on start + exit (`/api/admin/impersonate/exit`).
- Client: no local-only fallback; restores SaaS tokens on exit.
- Banner shows support reason.


## Stage 261 — Impersonation action guards

- `forbidImpersonation` middleware: password, 2FA, backup delete, employee delete blocked under Login-As.
- `IMPERSONATE_READ_ONLY=1` → all non-GET blocked while impersonating.
- Audit entries can include `impersonatorId` / `impersonatorRole` via `auditActorFromReq`.
- Client `assertNotImpersonated` helper.


## Stage 262 — Audit log Login-As filter

- `GET /api/admin/audit-logs?impersonation=1&limit=300`
- Admin audit table: **Login-As only** filter + impersonator in details.
- Impersonate actions marked critical in shop AuditLog severity helper.


## Stage 263 — Production readiness expansion

- Readiness checks: IMPERSONATE_TTL, IMPERSONATE_READ_ONLY, OTP_DEV_ECHO/SKIP in prod (fail if on), BACKUP_AT_REST_KEY, ADMIN_URL, OTP_PEPPER.
- `readyForProd` = production + no failed **required** checks.
- `.env.example` documents Login-As policy vars.


## Stage 264 — Admin readiness panel UI

- **Prod readiness** opens an in-page panel listing all checks (pass/warn/fail) with category, detail, required-for-prod flag.


## Stage 265 — UI ACL, Buy access, employee role dashboard

- `canAccessPermission` / `isFullAccessRole`: SHOP_OWNER no longer blocked by empty permissions (fixes Buy Access Denied).
- Employee login maps **backend permissions**; staff with POS/inventory perms get main app shell (permission-filtered nav + dashboard).
- HR-only employees stay on EmployeePortal.
- ProtectedRoute + sidebar use shared ACL helper.
- Buy pane `min-h-0` for mobile flex scroll.


## Stage 266 — Bugfix + UI/UX pass

- Buy: error alert on failed finalize; mobile checkout bar sits above bottom nav (`bottom-16`).
- Main scroll area: bottom padding for mobile nav.
- Employee portal: CTA when operational permissions exist; `100dvh` layout.
- Dashboard: tighter mobile padding.


## Stage 267 — Bottom nav on all shop pages

- Mobile bottom nav on every Layout page including POS, settings, reports (not SaaS/public storefront).
- Extra bottom-nav targets: customers, reports (permission filtered, max 4).
- Employee portal has its own bottom tab bar on all portal screens.


## Stage 268 — POS sticky bars above bottom nav

- Sell / Buy mobile checkout bars use `bottom-16` + `z-[45]` so they sit above the global bottom nav.


## Stage 269 — Mobile menu UX

- Body scroll lock + Escape to close.
- Header shows user name / Staff label.
- Safe-area on drawer; Settings + Logout quick actions at top of menu.


## Stage 270 — Connection status chip

- Header chip: Online / Offline / pending queue count (always visible on mobile).
- Offline banner slightly tighter on small screens.


## Stage 271 — Route scroll reset

- Changing routes scrolls main content to top.
- Mobile menu closes automatically on navigation.


## Stage 272 — Dynamic document title

- `document.title` updates per route: `{Page} · {Business} · Bizora`.


## Stage 273 — Mobile theme-color & safe-area

- `theme-color` meta: indigo default, red offline, amber during Login-As.
- Body no longer double-applies safe-area padding (bottom nav owns it).


## Stage 274 — Mobile tap responsiveness

- Global `touch-action: manipulation` to reduce mobile tap delay.


## Stage 275 — Route-level code splitting

- Heavy pages lazy-loaded via `React.lazy` + `Suspense`.
- Eager: Dashboard, Sell, Buy, QuickSale, Auth, portals, NotificationCenter.
- Mobile first load stays lighter; secondary routes show a small spinner.


## Stage 276 — Route error boundary

- `RouteErrorBoundary` wraps lazy routes: failed chunk/render shows Reload + Go Home instead of white screen.


## Stage 277 — Nav route prefetch

- Hover/focus/touch on sidebar, mobile menu, and bottom nav warms lazy chunks via `prefetchRoute`.


## Stage 278 — Idle prefetch

- After login, `requestIdleCallback` warms Stock, Customers, Cashbox, Settings, Reports, Products chunks in the background.


## Stage 279 — Soft retry on route errors

- RouteErrorBoundary: **Retry** remounts children without full reload; **Reload app** hard refresh.
- Friendlier copy for chunk load failures (offline / deploy update).


## Stage 280 — App update banner

- Production SW `updatefound` → **Update / Later** banner.
- Cache `bizora-cache-v2`; periodic update check every 30 min.


## Stage 281 — App version label

- `shared/lib/appVersion.ts` — `APP_VERSION` / `APP_BUILD`.
- Settings page footer shows version for support diagnostics.

## Stage 282 — Auth version footer

- Login/signup screen shows `appVersionLabel()` under the form.



## Stage 283 — Admin readiness shows app version

- Admin readiness panel header includes `appVersionLabel()`.
- Backend `/api/admin/readiness` returns `appVersion` / `appBuild` when set via env.


## Stage 284 — Download readiness JSON

- Admin readiness panel: **Download JSON** exports checks + client version + timestamp for support.


## Stage 285 — Copy readiness summary

- Admin readiness panel: **Copy summary** pastes pass/warn/fail ids + version into clipboard for support chat.


## Stage 286 — Readiness filter chips

- Admin readiness panel: **All / Fails / Warns** filter for faster scan.


## Stage 287 — Readiness severity sort

- Readiness checks ordered **fail → warn → pass** within the active filter.

## Stage 288 — Production hardening (priority 1)

- Tailwind via **PostCSS** (frontend + admin): no `cdn.tailwindcss.com`.
- `tailwind.config.js` / `postcss.config.js` / `src/index.css`.
- Restored `admin/index.html` (was empty).
- `docs/PRODUCTION.md` secrets + OTP + build checklist.
- `.env.example` production banner.


## Stage 289 — Employee role templates in HR UI

- Add/Edit employee applies `resolveStaffPermissions` + `roleTemplateId` from RBAC packs (Cashier, Manager, …).
- Role dropdown lists all non-custom `RBAC_ROLE_TEMPLATES`.

## Stage 290 — E2E smoke checklist + RBAC tests

- `docs/SMOKE_TEST.md` manual path: signup → POS → staff → backup → admin.
- `shared/lib/rbacRoles.test.ts` + `npm run test:smoke`.

## Stage 291 — AdminPanel split (readiness module)

- Extracted `admin/src/components/admin/AdminReadinessPanel.tsx` (filter / sort / copy / download).
- Pattern for further tab extractions modules under `admin/src/components/admin/`.

## Stage 292 — Admin nav categories module

- `admin/src/components/admin/adminNavCategories.tsx` — sidebar module defs + role filter.
- AdminPanel uses `ADMIN_NAV_CATEGORIES` / `getAdminModulesForRole`.


## Stage 293 — Admin subscription badge extract + courier tenant guard

- `admin/src/components/admin/SubscriptionHealthBadge.tsx`.
- Courier API routes: `requireBusinessContext` on settings/ship.

## Stage 294 — Admin Businesses tab extract

- `admin/src/components/admin/AdminBusinessesTab.tsx` (~230 lines).
- AdminPanel ~9384 lines (down from ~9.6k+).

## Stage 295 — Admin Support tab extract

- `admin/src/components/admin/AdminSupportTab.tsx`.
- AdminPanel ~9105 lines.

## Stage 296 — Admin Subscriptions tab extract

- `admin/src/components/admin/AdminSubscriptionsTab.tsx`.
- AdminPanel ~8912 lines.

## Stage 297 — Admin Dashboard + Notifications extract

- `AdminNotificationsTab.tsx` (~840 lines)
- `AdminDashboardTab.tsx` (~1400 lines) with metric props
- AdminPanel ~6.8k lines (from ~8.9k / original ~9.8k)

## Stage 298 — Admin Employees + Security tab extract

- `AdminEmployeesTab.tsx` (~500 lines)
- `AdminSecurityTab.tsx` (~120 lines) + backup/archive handlers
- AdminPanel ~6300 lines

## Stage 299 — Customer Search + Revenue Center extract

- `AdminCustomerSearchTab.tsx`, `AdminRevenueCenterTab.tsx`
- AdminPanel ~5887 lines

## Stage 300 — Payment / Announcements / System Settings extract

- AdminPaymentGatewayTab, AdminAnnouncementsTab, AdminSystemSettingsTab
- AdminPanel ~5627 lines

## Stage 301 — Finance / CMS / Features / DB / API extract

- AdminFinanceAnalyticsTab, AdminWebsiteCmsTab, AdminFeatureManagerTab, AdminDatabaseManagerTab, AdminApiManagerTab
- AdminPanel ~5266 lines

## Stage 302 — AI / Marketing / Portals / Logs / Analytics extract

- AdminAiCenterTab, AdminMarketingCenterTab, AdminCustomerPortalTab, AdminSupplierPortalTab, AdminLogsTab, AdminAnalyticsCenterTab
- AdminPanel ~4627 lines

## Stage 303 — Remaining admin tabs extract

- Templates, Audit, Reports, Global Search, Monitoring, Developer, Owner Profile, Enterprise
- Fixed AuditLog import; templates list prop
- AdminPanel ~4324 lines

## Stage 304 — Admin modules barrel + cleanup

- `admin/src/components/admin/index.ts` re-exports all tab modules.
- Empty `Props` / broken `({ , })` destructuring cleaned.

## Stage 305 — Admin tab QA fixes

- Missing lucide / recharts imports on Businesses, Dashboard, Employees, Revenue, etc.
- Leaked tab markers stripped.
- PaymentGateway truncated (had Revenue Center nested).
- gatewayLogs prop wired.

## Stage 306 — Admin QA: imports + comment cleanup

- Stripped leaked tab comments from ~18 modules.
- Added 19 missing tab imports to AdminPanel (would have crashed those tabs).


## Stage 307 — Role nav audit + glass capsule mobile dock

- Bottom dock: floating glass capsule (`backdrop-blur`, rounded-full pill).
- Dock pool: Sell, Buy, Stock, Cash, Customers, Due, Reports, HR, Settings (first 4 by permission).
- Employee portal: same glass dock.
- SaaS ADMIN / SUPPORT sidebar tab lists expanded.
#   m y  
 