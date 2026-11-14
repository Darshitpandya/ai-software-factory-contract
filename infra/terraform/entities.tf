# ─── Seed Entities ───────────────────────────────────────────────────────────
# Core entities that every consumer needs to bootstrap the control plane.

# ── Factory Releases ──────────────────────────────────────────────────────────
resource "port_entity" "factory_release_140" {
  identifier = "factory-release-1.4.0"
  blueprint  = port_blueprint.factory_release.identifier
  title      = "Factory Release 1.4.0"

  properties = {
    string_props = {
      "version"      = "1.4.0"
      "status"       = "ACTIVE"
      "claudeModel"  = "claude-opus-5-5"
      "imageDigest"  = "sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a"
      "changelogUrl" = "https://github.com/${var.github_owner}/ai-software-factory-contract/blob/main/factory-releases/1.4.0/factory-release.yaml"
    }
    boolean_props = {
      "isActive" = true
    }
  }
}

resource "port_entity" "factory_release_150" {
  identifier = "factory-release-1.5.0"
  blueprint  = port_blueprint.factory_release.identifier
  title      = "Factory Release 1.5.0"

  properties = {
    string_props = {
      "version"      = "1.5.0"
      "status"       = "CANDIDATE"
      "claudeModel"  = "claude-opus-5-5"
      "imageDigest"  = "sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a"
      "changelogUrl" = "https://github.com/${var.github_owner}/ai-software-factory-contract/blob/main/factory-releases/1.5.0/factory-release.yaml"
    }
    boolean_props = {
      "isActive" = false
    }
  }
}

# ── Consumer Services ─────────────────────────────────────────────────────────
resource "port_entity" "service_billing_api" {
  identifier = "factory-reference-billing-api"
  blueprint  = port_blueprint.service.identifier
  title      = "Billing API"

  properties = {
    string_props = {
      "language"        = "TypeScript"
      "owner"           = "billing-domain"
      "repoUrl"         = "https://github.com/${var.github_owner}/${var.billing_repo_name}"
      "consumedRelease" = "1.4.0"
    }
  }
}

resource "port_entity" "service_notification_api" {
  identifier = "factory-reference-notification-api"
  blueprint  = port_blueprint.service.identifier
  title      = "Notification API"

  properties = {
    string_props = {
      "language"        = "Python"
      "owner"           = "notifications-domain"
      "repoUrl"         = "https://github.com/${var.github_owner}/${var.notification_repo_name}"
      "consumedRelease" = "1.4.0"
    }
  }
}

# ── Work Orders ───────────────────────────────────────────────────────────────
resource "port_entity" "work_order_billing_invoice" {
  identifier = "wo-billing-invoice-export-001"
  blueprint  = port_blueprint.work_order.identifier
  title      = "Tenant-Scoped Invoice Export"

  properties = {
    string_props = {
      "scope"          = "Add tenant-scoped CSV invoice export endpoint with formula injection protection"
      "requestedBy"    = "billing-domain"
      "factoryRelease" = "1.4.0"
      "status"         = "PENDING"
    }
  }

  relations = {
    "targetService" = port_entity.service_billing_api.identifier
  }
}

resource "port_entity" "work_order_notification_schema" {
  identifier = "wo-notification-schema-001"
  blueprint  = port_blueprint.work_order.identifier
  title      = "Notification Event Schema — Add account.reactivated"

  properties = {
    string_props = {
      "scope"          = "Add account.reactivated event type to notification contract — non-breaking addition"
      "requestedBy"    = "notifications-domain"
      "factoryRelease" = "1.4.0"
      "status"         = "PENDING"
    }
  }

  relations = {
    "targetService" = port_entity.service_notification_api.identifier
  }
}
