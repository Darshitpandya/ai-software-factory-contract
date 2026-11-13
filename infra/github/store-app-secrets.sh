#!/bin/bash
# store-app-secrets.sh
# Stores both GitHub App credentials as GitHub Actions secrets.
# Run once after creating both Apps and downloading their private keys.
#
# Usage: bash infra/github/store-app-secrets.sh

set -e

OWNER="Darshitpandya"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Storing GitHub App credentials as Actions secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Have these ready (from github.com/settings/apps):"
echo "  - Producer App ID"
echo "  - Producer Installation ID (from /settings/installations)"
echo "  - Producer private key .pem file path"
echo "  - Verifier App ID"
echo "  - Verifier Installation ID"
echo "  - Verifier private key .pem file path"
echo "  - Verifier webhook secret (the one you set in General)"
echo ""

# ── Collect values ─────────────────────────────────────────────────────────────
read -p "Producer App ID:                    " PROD_APP_ID
read -p "Producer Installation ID:           " PROD_INSTALL_ID
read -p "Producer private key .pem path:     " PROD_KEY_PATH
echo ""
read -p "Verifier App ID:                    " VER_APP_ID
read -p "Verifier Installation ID:           " VER_INSTALL_ID
read -p "Verifier private key .pem path:     " VER_KEY_PATH
read -p "Verifier webhook secret:            " -s VER_WEBHOOK_SECRET
echo ""

# ── Validate files exist ───────────────────────────────────────────────────────
if [ ! -f "$PROD_KEY_PATH" ]; then echo "✗ Producer key not found: $PROD_KEY_PATH"; exit 1; fi
if [ ! -f "$VER_KEY_PATH" ];  then echo "✗ Verifier key not found: $VER_KEY_PATH";  exit 1; fi

echo ""
echo "Storing Producer App secrets → ai-software-factory-contract ..."
printf '%s' "$PROD_APP_ID"      | gh secret set GITHUB_APP_ID              --repo "$OWNER/ai-software-factory-contract"
printf '%s' "$PROD_INSTALL_ID"  | gh secret set GITHUB_APP_INSTALLATION_ID --repo "$OWNER/ai-software-factory-contract"
cat  "$PROD_KEY_PATH"           | gh secret set GITHUB_APP_PRIVATE_KEY     --repo "$OWNER/ai-software-factory-contract"
echo "  ✓ Producer App secrets stored"

echo ""
echo "Storing Verifier App secrets → ai-factory-trusted-verifier ..."
printf '%s' "$VER_APP_ID"            | gh secret set VERIFIER_APP_ID            --repo "$OWNER/ai-factory-trusted-verifier"
printf '%s' "$VER_INSTALL_ID"        | gh secret set VERIFIER_INSTALLATION_ID   --repo "$OWNER/ai-factory-trusted-verifier"
printf '%s' "$VER_WEBHOOK_SECRET"    | gh secret set VERIFIER_WEBHOOK_SECRET    --repo "$OWNER/ai-factory-trusted-verifier"
cat  "$VER_KEY_PATH"                 | gh secret set VERIFIER_APP_PRIVATE_KEY   --repo "$OWNER/ai-factory-trusted-verifier"
printf '%s' "$OWNER/factory-reference-billing-api,$OWNER/factory-reference-notification-api" \
                                     | gh secret set ALLOWED_REPOS              --repo "$OWNER/ai-factory-trusted-verifier"
echo "  ✓ Verifier App secrets stored"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ All secrets stored. Next: deploy the verifier."
echo ""
echo "  Run one of:"
echo "    brew install ngrok && ngrok http 3002   (local demo)"
echo "    npm install -g @railway/cli && railway login && railway up"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
