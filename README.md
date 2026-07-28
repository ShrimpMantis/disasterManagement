# ReliefNet

Next.js disaster management app with Firebase Authentication.

## Features

- **Login** — email/password or phone number (SMS OTP) via Firebase
- **Register** — create an email/password account
- **Forgot / reset password** — Firebase password reset email flow
- **Village relief grid** — AG Grid at `/reliefDemandManagement` with row selection, per-column filters, and Excel upload/download (SheetJS)

## Getting started

1. Copy env template and fill in your Firebase web app config:

```bash
cp .env.local.example .env.local
```

2. In the Firebase console:
   - Enable **Email/Password** and **Phone** sign-in providers
   - Add `localhost` to **Authentication → Settings → Authorized domains**
   - (Optional) Set the email action URL / continue URL to `http://localhost:3000/reset-password` for custom password reset handling

3. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Before pushing, verify the production build locally:

```bash
npm run build:check
```

## Firebase App Hosting

SSR, Server Actions, and API routes run on [Firebase App Hosting](https://firebase.google.com/docs/app-hosting). Config lives in `apphosting.yaml`.

### One-time setup

1. Create a backend linked to this GitHub repo (default branch `main`):

```bash
firebase login
firebase apphosting:backends:create --project disastermgmt-ccf14
```

Pushing to `main` then triggers an automatic App Hosting build and rollout.

2. Provision Admin SDK secrets in Secret Manager and grant the App Hosting compute SA access:

```bash
# Interactive prompts for client email + private key
npm run apphosting:secrets

# After the backend exists, grant access (replace with your backend id):
BACKEND_ID=reliefnet npm run apphosting:secrets
```

Secrets are bound in `apphosting.yaml` as `FIREBASE_ADMIN_CLIENT_EMAIL` and `FIREBASE_ADMIN_PRIVATE_KEY`. The compute service account is `firebase-app-hosting-compute@disastermgmt-ccf14.iam.gserviceaccount.com`.

3. Optional client keys for Maps / admin emails can be added later under `env:` in `apphosting.yaml` (or as additional secrets).

## Auth notes

- Auth is handled client-side with the Firebase JS SDK.
- Phone sign-in uses invisible reCAPTCHA and SMS OTP (`+` country code required, e.g. `+919876543210`).
- Password reset emails are sent by Firebase for email/password accounts.
- Protected routes (`/dashboard`, `/reliefDemandManagement`) use an auth guard based on Firebase auth state.
