#!/bin/bash
# start-local.sh
# Step 5: Start local infrastructure and run factory doctor.
# Run from the workspace root (where ai-software-factory-contract/ is a subdirectory).
#
# Usage: ./infra/github/start-local.sh

set -e

FACTORY_DIR="$(dirname "$0")/../../ai-software-factory-contract"
cd "$FACTORY_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AI Software Factory — Local Startup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Env check ────────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo "✗ .env not found. Copy .env.example and fill in credentials:"
  echo "  cp .env.example .env"
  echo "  # Then edit .env with real values"
  exit 1
fi

# Source .env
export $(grep -v '^#' .env | grep -v '^$' | xargs)

echo "Checking critical vars..."
MISSING=0
for VAR in PORT_CLIENT_ID PORT_CLIENT_SECRET ANTHROPIC_API_KEY DATABASE_URL; do
  if [ -z "${!VAR}" ] || [[ "${!VAR}" == "REPLACE"* ]]; then
    echo "  ✗ $VAR not set (still placeholder)"
    MISSING=$((MISSING + 1))
  else
    echo "  ✓ $VAR set"
  fi
done

if [ $MISSING -gt 0 ]; then
  echo ""
  echo "✗ $MISSING required variable(s) missing. Edit .env and retry."
  exit 1
fi

echo ""
echo "1. Starting Docker services (PostgreSQL + verifier PostgreSQL)..."
docker compose -f infra/local/docker-compose.yaml up -d postgres postgres-verifier 2>&1 | tail -3
echo "   Waiting for PostgreSQL to be ready..."
sleep 5

echo ""
echo "2. Installing dependencies..."
pnpm install --frozen-lockfile 2>&1 | tail -2

echo ""
echo "3. Running database migrations..."
psql "$DATABASE_URL" < db/migrations/001_init.sql 2>&1 | tail -3
echo "   ✓ Migrations applied"

echo ""
echo "4. Computing skills.lock.json digests..."
pnpm lock-components 2>&1 | tail -3

echo ""
echo "5. Applying Port entities..."
pnpm factory:port:apply 2>&1 | tail -5

echo ""
echo "6. Verifying component registry..."
pnpm factory:registry:verify 2>&1 | tail -3

echo ""
echo "7. Running factory doctor..."
pnpm factory:doctor --profile local-dev

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Local infrastructure ready!"
echo ""
echo "  To start the coordinator:"
echo "    pnpm --filter factory-coordinator start"
echo ""
echo "  To trigger a factory run:"
echo "    pnpm factory:run --work-order wo-billing-invoice-export-001 --release 1.4.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
