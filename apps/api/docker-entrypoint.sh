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

# تهيئة أول منشأة تلقائياً على Render (idempotent) إذا تم ضبط BOOTSTRAP_TENANT=true
if [ "${BOOTSTRAP_TENANT:-false}" = "true" ]; then
  if [ -n "${TENANT_NAME:-}" ] && [ -n "${TENANT_SLUG:-}" ] && [ -n "${OWNER_EMAIL:-}" ] && [ -n "${OWNER_PASSWORD:-}" ]; then
    echo ">> Bootstrapping first tenant..."
    pnpm --filter @talaltechno/database provision:tenant -- --if-missing \
      --name "${TENANT_NAME}" \
      --slug "${TENANT_SLUG}" \
      --email "${OWNER_EMAIL}" \
      --password "${OWNER_PASSWORD}" \
      --branch "${TENANT_BRANCH:-الفرع الرئيسي}" \
      --city "${TENANT_CITY:-الرياض}" || echo ">> Bootstrap skipped or failed (non-fatal)"
  else
    echo ">> BOOTSTRAP_TENANT=true but missing required env (TENANT_NAME/TENANT_SLUG/OWNER_EMAIL/OWNER_PASSWORD) — skipping"
  fi
fi

exec node apps/api/dist/main.js
