#!/usr/bin/env bash
# Provision App Hosting secrets in Google Cloud Secret Manager and grant
# access to the Firebase App Hosting compute service account.
#
# Usage:
#   npm run apphosting:secrets
#   # or with an explicit backend id:
#   BACKEND_ID=my-backend npm run apphosting:secrets
#
# Prerequisites: firebase login, roles/secretmanager.admin (or equivalent)

set -euo pipefail

PROJECT_ID="${FIREBASE_PROJECT_ID:-disastermgmt-ccf14}"
BACKEND_ID="${BACKEND_ID:-}"
COMPUTE_SA="firebase-app-hosting-compute@${PROJECT_ID}.iam.gserviceaccount.com"

echo "==> Project: ${PROJECT_ID}"
echo "==> App Hosting compute SA: ${COMPUTE_SA}"
echo ""
echo "You will be prompted to paste each secret value."
echo "  FIREBASE_ADMIN_CLIENT_EMAIL  → service account email"
echo "  FIREBASE_ADMIN_PRIVATE_KEY   → PEM private key (use \\n for newlines, or paste multiline)"
echo ""

firebase apphosting:secrets:set FIREBASE_ADMIN_CLIENT_EMAIL --project "${PROJECT_ID}"
firebase apphosting:secrets:set FIREBASE_ADMIN_PRIVATE_KEY --project "${PROJECT_ID}"

if [[ -n "${BACKEND_ID}" ]]; then
  echo ""
  echo "==> Granting secret access to backend: ${BACKEND_ID}"
  firebase apphosting:secrets:grantaccess \
    FIREBASE_ADMIN_CLIENT_EMAIL,FIREBASE_ADMIN_PRIVATE_KEY \
    --backend "${BACKEND_ID}" \
    --project "${PROJECT_ID}"
else
  echo ""
  echo "==> Skipping grantaccess (set BACKEND_ID to grant automatically)."
  echo "    After creating a backend, run:"
  echo "    firebase apphosting:secrets:grantaccess \\"
  echo "      FIREBASE_ADMIN_CLIENT_EMAIL,FIREBASE_ADMIN_PRIVATE_KEY \\"
  echo "      --backend <BACKEND_ID> --project ${PROJECT_ID}"
  echo ""
  echo "    Or in Google Cloud Console → IAM, grant Secret Manager Secret Accessor"
  echo "    to ${COMPUTE_SA} for both secrets."
fi

echo ""
echo "Done. Redeploy / roll out App Hosting so new secret bindings take effect."
