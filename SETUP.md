# Running Bizora locally - step by step

This assumes you've unzipped `bizora-monorepo` somewhere and have a
terminal open in that folder. You'll need **Node.js 18+** installed.

## 1. Install everything

```bash
npm install
```

This is an npm-workspaces monorepo, so one `install` at the root pulls in
`shared`, `backend`, `frontend`, and `admin` together. If it ever
complains about a workspace, just re-run it from the repo root (not from
inside a subfolder).

## 2. Set up Firebase (needed for the backend to store any real data)

1. Go to the [Firebase Console](https://console.firebase.google.com),
   create a project (or use an existing one).
2. Enable **Firestore Database** (Native mode is fine).
3. Go to **Project Settings → Service Accounts → Generate new private
   key**. This downloads a JSON file - keep it safe, don't commit it
   anywhere.
4. Open that JSON file and copy its *entire contents as one line* (most
   editors have a "minify JSON" action, or just remove the line breaks).

## 3. Configure environment variables

Copy each `.env.example` to `.env` in the same folder, then fill it in:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env
```

**`backend/.env`** - the important ones:
- `JWT_SECRET` - any long random string (e.g. run
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  and paste the result).
- `FIREBASE_SERVICE_ACCOUNT_JSON` - paste the one-line JSON from step 2.
- `SAAS_OWNER_EMAIL` / `SAAS_OWNER_MOBILE` / `SAAS_OWNER_NAME` - whatever
  you want your own SaaS Owner login to be.
- `SAAS_OWNER_PASSWORD_HASH` - generate this, don't type a plain password:
  ```bash
  node backend/scripts/generate-password-hash.mjs "your chosen password"
  ```
  Paste the output (starts with `$2a$...`) into `.env`.
- External AI keys (e.g. OpenAI / Gemini) - **not needed**, Bizora ERP Assistant runs 100% on-premises without external AI dependencies or third-party API keys. OTP delivery and emails are self-contained/console-logged in development.

**`frontend/.env`** and **`admin/.env`** - the defaults
(`VITE_API_URL=http://localhost:3000`, etc.) are already correct for
local dev; you only need to change these when deploying somewhere.

## 4. Run all three apps

Open three terminals (or use a process manager like `concurrently` /
`pm2` if you prefer one window):

```bash
npm run dev:backend    # http://localhost:3000
npm run dev:frontend   # http://localhost:5173  - the main business app
npm run dev:admin      # http://localhost:5174  - the SaaS admin app
```

## 5. First login

- **As a Shop Owner:** open http://localhost:5173, sign up as a new
  business. This is real - it creates a document in your Firestore
  `businesses` collection.
- **As the SaaS Owner:** open http://localhost:5174/admin and log in with
  the `SAAS_OWNER_EMAIL`/`SAAS_OWNER_MOBILE` + the plain password you
  hashed in step 3.

## Troubleshooting

- **"Cannot find module 'firebase-admin'" or similar** → `npm install`
  didn't finish or was run in the wrong folder; re-run it from the repo
  root.
- **Backend crashes on startup mentioning Firebase/credentials** →
  double check `FIREBASE_SERVICE_ACCOUNT_JSON` is valid JSON on one line
  (no stray line breaks) and that Firestore is actually enabled on that
  Firebase project.
- **Login says "Invalid credentials" for the SaaS Owner** → the password
  you're typing has to match what you *hashed* in step 3, not some other
  password - if unsure, just re-run the hash script with a new password
  and update `.env`.
- **Frontend loads but API calls fail (network errors in the console)** →
  make sure the backend terminal is actually running and shows
  `Bizora API server (+ real-time chat) running on http://localhost:3000`,
  and that `frontend/.env` / `admin/.env` point at that same port.
- **Employee/Supplier/Customer login, 2FA, or "forgot PIN" doesn't seem to
  send anything** → that's expected right now - see the README's
  "delivery stub" notes. Check the *backend terminal's console output*;
  the verification code is printed there (`[DEV ONLY] ...`) since no real
  SMS/email provider is wired in yet.
