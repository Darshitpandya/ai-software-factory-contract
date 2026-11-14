# ─── GitHub — branch protection for consumer repos ────────────────────────────
# Requires the repos to be public (free GitHub) or GitHub Pro/Team for private.
# factory-contract/acceptance is posted by the Trusted Verifier GitHub App.

resource "github_branch_protection" "billing_api_main" {
  repository_id = var.billing_repo_name
  pattern       = "main"

  required_status_checks {
    strict   = false
    contexts = ["factory-contract/acceptance", "build-test"]
  }

  required_pull_request_reviews {
    dismiss_stale_reviews = false
    required_approving_review_count = 0
  }

  enforce_admins = false
}

resource "github_branch_protection" "notification_api_main" {
  repository_id = var.notification_repo_name
  pattern       = "main"

  required_status_checks {
    strict   = false
    contexts = ["factory-contract/acceptance", "build-test"]
  }

  required_pull_request_reviews {
    dismiss_stale_reviews = false
    required_approving_review_count = 0
  }

  enforce_admins = false
}

# ── Repository secrets — shared between both consumer repos ────────────────────
# These secrets are used by the GitHub Actions CI workflow.
# The FACTORY_APP_* and VERIFIER_APP_* secrets are set via the
# infra/github/store-app-secrets.sh script (uses actual PEM files).

# Note: GitHub App private keys are stored directly via CLI (store-app-secrets.sh)
# because Terraform would expose them in state. Only non-sensitive config vars here.

resource "github_actions_variable" "billing_allowed_repos" {
  repository    = var.billing_repo_name
  variable_name = "VERIFIER_URL"
  value         = "https://web-production-fff93264.up.railway.app"
}

resource "github_actions_variable" "notification_allowed_repos" {
  repository    = var.notification_repo_name
  variable_name = "VERIFIER_URL"
  value         = "https://web-production-fff93264.up.railway.app"
}
