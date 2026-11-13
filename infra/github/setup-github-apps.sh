#!/bin/bash
# setup-github-apps.sh
# Automates everything that CAN be automated after the two Apps are created manually.
# Run this AFTER creating both Apps in the browser.
#
# Usage:
#   chmod +x infra/github/setup-github-apps.sh
#   ./infra/github/setup-github-apps.sh

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AI Software Factory — GitHub App Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

OWNER="Darshitpandya"

# ── Collect credentials ────────────────────────────────────────────────────────
read -p "Producer App ID (from github.com/settings/apps/ai-factory-producer):       " PRODUCER_APP_ID
read -p "Producer App Installation ID (from App → Install → see URL):               " PRODUCER_INSTALL_ID
read -p "Producer App Webhook Secret (you generated this):                           " -s PRODUCER_WEBHOOK_SECRET; echo
read -p "Path to producer private key .pem file:                                     " PRODUCER_KEY_PATH

echo ""
read -p "Verifier App ID (from github.com/settings/apps/ai-factory-verifier):        " VERIFIER_APP_ID
read -p "Verifier App Installation ID:                                                " VERIFIER_INSTALL_ID
read -p "Verifier App Webhook Secret:                                                 " -s VERIFIER_WEBHOOK_SECRET; echo
read -p "Path to verifier private key .pem file:                                     " VERIFIER_KEY_PATH

echo ""

# ── Producer App secrets → ai-software-factory-contract ───────────────────────
echo "Setting Producer App secrets on ai-software-factory-contract..."
printf '%s' "$PRODUCER_APP_ID"           | gh secret set GITHUB_APP_ID             --repo "$OWNER/ai-software-factory-contract"
printf '%s' "$PRODUCER_INSTALL_ID"       | gh secret set GITHUB_APP_INSTALLATION_ID --repo "$OWNER/ai-software-factory-contract"
printf '%s' "$PRODUCER_WEBHOOK_SECRET"   | gh secret set GITHUB_APP_WEBHOOK_SECRET  --repo "$OWNER/ai-software-factory-contract"
cat "$PRODUCER_KEY_PATH"                 | gh secret set GITHUB_APP_PRIVATE_KEY     --repo "$OWNER/ai-software-factory-contract"
echo "  ✓ Producer App secrets set"

# ── Verifier App secrets → ai-factory-trusted-verifier ────────────────────────
echo ""
echo "Setting Verifier App secrets on ai-factory-trusted-verifier..."
printf '%s' "$VERIFIER_APP_ID"       | gh secret set VERIFIER_APP_ID       --repo "$OWNER/ai-factory-trusted-verifier"
printf '%s' "$VERIFIER_INSTALL_ID"   | gh secret set VERIFIER_INSTALLATION_ID --repo "$OWNER/ai-factory-trusted-verifier"
printf '%s' "$VERIFIER_WEBHOOK_SECRET" | gh secret set VERIFIER_WEBHOOK_SECRET --repo "$OWNER/ai-factory-trusted-verifier"
cat "$VERIFIER_KEY_PATH"             | gh secret set VERIFIER_APP_PRIVATE_KEY --repo "$OWNER/ai-factory-trusted-verifier"
printf '%s' "$OWNER/factory-reference-billing-api,$OWNER/factory-reference-notification-api" \
  | gh secret set ALLOWED_REPOS --repo "$OWNER/ai-factory-trusted-verifier"
echo "  ✓ Verifier App secrets set"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Next: deploy the verifier, then update VERIFIER_HTTPS_URL"
echo "  Run:  ./infra/github/update-verifier-webhook.sh <HTTPS_URL>"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
