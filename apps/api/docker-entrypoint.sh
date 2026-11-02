#!/bin/sh
set -eu

# Push the Prisma schema on boot. For a real production deployment replace this
# with `prisma migrate deploy` once versioned migrations are committed.
if [ "${RUN_DB_PUSH:-true}" = "true" ]; then
  echo ">> Applying Prisma schema..."
  pnpm --filter @talaltechno/database exec prisma db push --skip-generate
fi

if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo ">> Seeding demo restaurant data (destructive)..."
  pnpm --filter @talaltechno/database seed
fi

# تهيئة أول منشأة تلقائياً (idempotent). القيم تُقرأ من متغيرات البيئة
# (TENANT_NAME, TENANT_SLUG, OWNER_EMAIL, OWNER_PASSWORD, ...) — لا تمرير
# عبر shell لتجنب مشاكل التنصيص (quotes/$/spaces).
if [ "${BOOTSTRAP_TENANT:-false}" = "true" ]; then
  if [ -n "${TENANT_NAME:-}" ] && [ -n "${TENANT_SLUG:-}" ] && [ -n "${OWNER_EMAIL:-}" ] && [ -n "${OWNER_PASSWORD:-}" ]; then
    echo ">> Bootstrapping first tenant..."
    EXTRA=""
    if [ "${RESET_OWNER_PASSWORD:-false}" = "true" ]; then
      echo ">> RESET_OWNER_PASSWORD=true — resetting owner password."
      EXTRA="--reset-password"
    fi
    # shellcheck disable=SC2086
    pnpm --filter @talaltechno/database provision:tenant -- --if-missing $EXTRA \
      || echo ">> Bootstrap skipped or failed (non-fatal)"
  else
    echo ">> BOOTSTRAP_TENANT=true but missing required env (TENANT_NAME/TENANT_SLUG/OWNER_EMAIL/OWNER_PASSWORD) — skipping"
  fi
fi

exec node apps/api/dist/main.js
