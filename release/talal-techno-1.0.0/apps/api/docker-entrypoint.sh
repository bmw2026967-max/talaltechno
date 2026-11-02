#!/bin/sh
set -eu

# Push the Prisma schema on boot. For a real production deployment replace this
# with `prisma migrate deploy` once versioned migrations are committed.
if [ "${RUN_DB_PUSH:-true}" = "true" ]; then
  echo "→ Applying Prisma schema..."
  pnpm --filter @talaltechno/database exec prisma db push --skip-generate
fi

if [ "${SEED_DEMO:-false}" = "true" ]; then
  echo "→ Seeding demo restaurant data (destructive)..."
  pnpm --filter @talaltechno/database seed
fi

exec node apps/api/dist/main.js
