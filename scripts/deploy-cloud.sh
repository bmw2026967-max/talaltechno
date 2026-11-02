#!/usr/bin/env sh
# طلال تكنو — سكربت النشر السحابي (VPS).
# يُشغّل على السيرفر بعد استكشاف المشروع (git clone) وإعداد .env.cloud.
# الاستخدام:
#   sudo apt-get install -y curl docker.io docker-compose-v2
#   ./scripts/deploy-cloud.sh

set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.cloud.yml}"
ENV_FILE="${ENV_FILE:-.env.cloud}"
DOMAIN="${DOMAIN:-erp.example.sa}"

echo "→ Building images (api / admin / emenu)..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build api admin emenu

echo "→ Starting stack (api / admin / emenu / caddy)..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d api admin emenu caddy

echo "→ Waiting for https://${DOMAIN}/health ..."
attempts=0
until curl -fsS --retry 5 --retry-delay 5 --retry-connrefused "https://${DOMAIN}/health" >/dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge 12 ]; then
    echo "✖ Health check failed after ${attempts} attempts" >&2
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=100 api admin emenu caddy || true
    exit 1
  fi
  sleep 10
done

echo "✔ Deployment healthy: https://${DOMAIN}/health"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
