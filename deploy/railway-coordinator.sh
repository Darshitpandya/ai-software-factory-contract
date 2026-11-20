#!/bin/sh
# deploy/railway-coordinator.sh
#
# Deploys the factory coordinator to Railway and wires all required environment
# variables. Run this once from the repo root after `railway login`.
#
# Prerequisites:
#   railway login
#   railway link <project-id>   (link to your existing Railway project)
#
# Usage:
#   chmod +x deploy/railway-coordinator.sh
#   ./deploy/railway-coordinator.sh

set -e

echo "Factory Coordinator — Railway deployment"
echo ""

# ── Confirm Railway is authenticated ─────────────────────────────────────────
if ! railway whoami > /dev/null 2>&1; then
  echo "✗ Not logged in to Railway. Run: railway login"
  exit 1
fi

echo "✓ Railway authenticated: $(railway whoami 2>/dev/null)"

# ── Create the coordinator service if it doesn't exist ───────────────────────
echo ""
echo "Creating coordinator service..."
railway service create factory-coordinator 2>/dev/null || echo "  (service may already exist)"

# ── Set all required environment variables ───────────────────────────────────
echo ""
echo "Setting environment variables..."

# Read from local .env if available, otherwise require them
load_env() {
  local key=$1
  local val
  val=$(grep "^$key=" .env 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'")
  echo "$val"
}

ANTHROPIC_KEY=$(load_env "ANTHROPIC_API_KEY")
PORT_ID=$(load_env "PORT_CLIENT_ID")
PORT_SECRET=$(load_env "PORT_CLIENT_SECRET")
DB_URL=$(load_env "DATABASE_URL")
APP_ID=$(load_env "FACTORY_APP_ID")
APP_INSTALL=$(load_env "FACTORY_APP_INSTALLATION_ID")
APP_WEBHOOK=$(load_env "FACTORY_APP_WEBHOOK_SECRET")

if [ -z "$ANTHROPIC_KEY" ] || [ -z "$PORT_ID" ] || [ -z "$DB_URL" ]; then
  echo "✗ Required env vars missing. Ensure .env is populated."
  echo "  Required: ANTHROPIC_API_KEY, PORT_CLIENT_ID, PORT_CLIENT_SECRET, DATABASE_URL"
  exit 1
fi

# Read private key file
PRIVATE_KEY_PATH=$(load_env "FACTORY_APP_PRIVATE_KEY_PATH")
if [ -f "$PRIVATE_KEY_PATH" ]; then
  PRIVATE_KEY=$(cat "$PRIVATE_KEY_PATH")
else
  echo "⚠ FACTORY_APP_PRIVATE_KEY_PATH not found — PR creation will be disabled"
  PRIVATE_KEY=""
fi

railway variables --service factory-coordinator set \
  ANTHROPIC_API_KEY="$ANTHROPIC_KEY" \
  PORT_CLIENT_ID="$PORT_ID" \
  PORT_CLIENT_SECRET="$PORT_SECRET" \
  PORT_BASE_URL="https://api.getport.io" \
  DATABASE_URL="$DB_URL" \
  DATABASE_SSL="true" \
  FACTORY_APP_ID="$APP_ID" \
  FACTORY_APP_INSTALLATION_ID="$APP_INSTALL" \
  FACTORY_APP_WEBHOOK_SECRET="$APP_WEBHOOK" \
  BILLING_REPO="Darshitpandya/factory-reference-billing-api" \
  NOTIFICATION_REPO="Darshitpandya/factory-reference-notification-api" \
  FACTORY_MAX_RETRIES="3" \
  FACTORY_STAGE_TIMEOUT_SECONDS="1800" \
  NODE_ENV="production"

# Private key needs special handling (multiline)
if [ -n "$PRIVATE_KEY" ]; then
  echo "$PRIVATE_KEY" | railway variables --service factory-coordinator set FACTORY_APP_PRIVATE_KEY_CONTENT=-
  railway variables --service factory-coordinator set FACTORY_APP_PRIVATE_KEY_PATH="/tmp/factory_app_key.pem"
  echo "  ✓ GitHub App private key configured"
fi

echo "  ✓ Environment variables set"

# ── Deploy ─────────────────────────────────────────────────────────────────────
echo ""
echo "Deploying coordinator..."
railway up --service factory-coordinator --dockerfile apps/factory-coordinator/Dockerfile

echo ""
echo "✓ Coordinator deployed to Railway"
echo ""
echo "Next steps:"
echo "  1. Get the Railway PostgreSQL public URL and set it as DATABASE_URL"
echo "     GitHub secret: gh secret set DATABASE_URL --repo Darshitpandya/ai-software-factory-contract"
echo "  2. Trigger a factory run from Port → workOrder → ▶ Trigger Factory Run"
echo "  3. Watch coordinator logs: railway logs --service factory-coordinator"
