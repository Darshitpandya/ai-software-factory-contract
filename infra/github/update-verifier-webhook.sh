#!/bin/bash
# update-verifier-webhook.sh
# After deploying the verifier, update:
#   1. The GitHub App webhook URL
#   2. The .env VERIFIER_URL for the verifier service
#   3. Branch protection on consumer repos
#
# Usage: ./infra/github/update-verifier-webhook.sh https://your-verifier.up.railway.app

set -e

HTTPS_URL="${1:?Usage: $0 <verifier-https-url>}"
OWNER="Darshitpandya"
GH_TOKEN=$(gh auth token)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Updating verifier to: $HTTPS_URL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. Health check the verifier ──────────────────────────────────────────────
echo "1. Checking verifier health..."
HEALTH=$(curl -s "$HTTPS_URL/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','?'), '| oasdiff:', d.get('oasdiffAvailable'))" 2>/dev/null || echo "UNREACHABLE")
echo "   $HEALTH"
if [[ "$HEALTH" == "UNREACHABLE" ]]; then
  echo "   ✗ Verifier not reachable. Deploy it first."
  exit 1
fi
echo "   ✓ Verifier is live"

# ── 2. Update GitHub App webhook URL ─────────────────────────────────────────
echo ""
echo "2. Update the Verifier App webhook URL in GitHub:"
echo "   → github.com/settings/apps/ai-factory-verifier"
echo "   → Webhook URL: $HTTPS_URL/webhook"
echo "   (This cannot be automated — requires browser)"
read -p "   Press Enter once you've updated the webhook URL in GitHub..."

# ── 3. Update branch protection on consumer repos ────────────────────────────
echo ""
echo "3. Updating branch protection on consumer repos..."
echo "   NOTE: Restricting check source to specific App requires GitHub Pro/Team."
echo "   For now setting required check name. Source restriction = manual step."

for REPO in "factory-reference-billing-api" "factory-reference-notification-api"; do
  echo ""
  echo "   $REPO..."
  curl -s -X PUT \
    "https://api.github.com/repos/$OWNER/$REPO/branches/main/protection" \
    -H "Authorization: Bearer $GH_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -d "{
      \"required_status_checks\": {
        \"strict\": true,
        \"contexts\": [\"factory-contract/acceptance\", \"build-test\"]
      },
      \"enforce_admins\": false,
      \"required_pull_request_reviews\": {
        \"required_approving_review_count\": 1,
        \"dismiss_stale_reviews\": true
      },
      \"restrictions\": null
    }" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('   ✓ OK' if 'url' in d else '   ✗ ' + str(d.get('message','?'))[:100])"
done

echo ""
echo "   MANUAL STEP — restrict check source:"
echo "   For each repo, go to:"
echo "   github.com/$OWNER/factory-reference-billing-api/settings/branches"
echo "   → Edit main protection → Required checks → factory-contract/acceptance"
echo "   → 'Require status to pass from a specific source' → ai-factory-verifier"
echo "   (GitHub Pro/Team required for source restriction)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Webhook + branch protection updated"
echo "  ✓ Open a test PR in factory-reference-billing-api"
echo "    — verifier should post factory-contract/acceptance"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
