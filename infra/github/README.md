# infra/github

Scripts for creating and configuring the two required GitHub Apps.

→ [Root README](../../README.md#github-apps-setup) for the full Apps setup.

---

## Why two Apps

The factory requires two separately owned GitHub Apps to enforce the trust boundary:

| App | Owned by | What it does | What it cannot do |
|-----|---------|-------------|------------------|
| `ai-factory-producer` | Factory repo | Creates PRs, reads code | Post `factory-contract/acceptance` check |
| `ai-factory-verifier` | Trusted verifier repo | Posts `factory-contract/acceptance` check | Modify code or policies |

Branch protection on consumer repos requires the check specifically from the verifier App's identity. No other token can satisfy it.

## Scripts

| Script | What it does |
|--------|-------------|
| `setup-github-apps.sh` | Guides creation of both Apps with correct permissions |
| `store-app-secrets.sh` | Stores private keys as GitHub Actions secrets (`FACTORY_APP_PRIVATE_KEY`, `VERIFIER_APP_PRIVATE_KEY`) |
| `start-local.sh` | Starts the coordinator locally with App credentials loaded |
| `update-verifier-webhook.sh` | Updates the verifier webhook URL after Railway deployment |

## Permissions required

**Producer App**
- `contents: read` · `pull_requests: write` · `actions: write` · `metadata: read`
- Install on: your consumer repos

**Verifier App**
- `contents: read` · `checks: write` · `pull_requests: read` · `metadata: read`
- Subscribe to: `pull_request`, `check_suite`
- Install on: your consumer repos

## What you bring

Your own GitHub account. These scripts create new Apps under your account — they do not use or reference any existing App credentials.
