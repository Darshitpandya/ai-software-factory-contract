# ─── Blueprints ──────────────────────────────────────────────────────────────
# All 7 blueprints that form the AI Software Factory Contract context model.
# Run: terraform apply → all blueprints created with relations, enums, and icons.

# ── service ──────────────────────────────────────────────────────────────────
resource "port_blueprint" "service" {
  identifier   = "service"
  title        = "Service"
  icon         = "Service"
  description  = "A software service managed under the AI Software Factory Contract."

  properties = {
    string_props = {
      "language" = {
        title    = "Language"
        required = false
        enum     = ["TypeScript", "Python", "Go", "Java", "Rust"]
        enum_colors = {
          "TypeScript" = "blue"
          "Python"     = "yellow"
          "Go"         = "green"
          "Java"       = "orange"
          "Rust"       = "brown"
        }
      }
      "owner" = {
        title    = "Owner"
        required = false
      }
      "repoUrl" = {
        title    = "Repository URL"
        required = false
        format   = "url"
      }
      "consumedRelease" = {
        title    = "Consumed Factory Release"
        required = false
      }
      "railwayUrl" = {
        title    = "Railway URL"
        required = false
        format   = "url"
      }
    }
  }
}

# ── workOrder ────────────────────────────────────────────────────────────────
resource "port_blueprint" "work_order" {
  identifier   = "workOrder"
  title        = "Work Order"
  icon         = "Blueprint"
  description  = "A scoped unit of work processed by the factory through all 5 stages."

  properties = {
    string_props = {
      "scope" = {
        title    = "Scope"
        required = false
      }
      "requestedBy" = {
        title    = "Requested By"
        required = false
      }
      "releaseVersion" = {
        title    = "Factory Release Version"
        required = false
      }
      "targetService" = {
        title    = "Target Service (ID)"
        required = false
      }
      "status" = {
        title    = "Status"
        required = false
        enum     = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED", "BLOCKED"]
        enum_colors = {
          "PENDING"   = "blue"
          "RUNNING"   = "yellow"
          "COMPLETED" = "green"
          "FAILED"    = "red"
          "CANCELLED" = "lightGray"
          "BLOCKED"   = "orange"
        }
      }
    }
  }

  relations = {
    # factoryRelease and service relations already exist in Port from manual setup
    # Terraform manages them without re-creating
    "factoryRelease" = {
      title    = "Factory Release"
      target   = "factoryRelease"
      many     = false
      required = false
    }
    "service" = {
      title    = "Service"
      target   = "service"
      many     = false
      required = false
    }
  }

  depends_on = [port_blueprint.service, port_blueprint.factory_release]
}

# ── factoryRelease ────────────────────────────────────────────────────────────
resource "port_blueprint" "factory_release" {
  identifier   = "factoryRelease"
  title        = "Factory Release"
  icon         = "Package"
  description  = "A versioned, immutable factory release with locked skills, models, and sandbox config."

  properties = {
    string_props = {
      "version" = {
        title    = "Version"
        required = false
      }
      "status" = {
        title    = "Status"
        required = false
        enum     = ["ACTIVE", "CANDIDATE", "DEPRECATED", "RETIRED"]
        enum_colors = {
          "ACTIVE"     = "green"
          "CANDIDATE"  = "yellow"
          "DEPRECATED" = "orange"
          "RETIRED"    = "lightGray"
        }
      }
      "claudeModel" = {
        title    = "Default Claude Model"
        required = false
      }
      "imageDigest" = {
        title    = "Sandbox Image Digest"
        required = false
      }
      "changelogUrl" = {
        title    = "Changelog URL"
        required = false
        format   = "url"
      }
    }
    boolean_props = {
      "isActive" = {
        title    = "Is Active"
        required = false
      }
    }
  }
}

# ── factoryRun ────────────────────────────────────────────────────────────────
resource "port_blueprint" "factory_run" {
  identifier   = "factoryRun"
  title        = "Factory Run"
  icon         = "Workflow"
  description  = "A live execution of the factory pipeline — 5 stages, real Claude artifacts."

  properties = {
    string_props = {
      "runId" = {
        title    = "Run ID"
        required = false
      }
      "status" = {
        title    = "Status"
        required = false
        enum     = ["PENDING", "RUNNING", "BLOCKED", "WAITING_FOR_HUMAN", "COMPLETED", "FAILED", "CANCELLED"]
        enum_colors = {
          "PENDING"            = "blue"
          "RUNNING"            = "yellow"
          "BLOCKED"            = "orange"
          "WAITING_FOR_HUMAN"  = "purple"
          "COMPLETED"          = "green"
          "FAILED"             = "red"
          "CANCELLED"          = "lightGray"
        }
      }
      "currentStage" = {
        title    = "Current Stage"
        required = false
        enum     = ["product-requirements", "software-architecture", "software-engineering", "security-compliance", "platform-operations"]
        enum_colors = {
          "product-requirements"    = "blue"
          "software-architecture"   = "purple"
          "software-engineering"    = "yellow"
          "security-compliance"     = "red"
          "platform-operations"     = "green"
        }
      }
      "githubRunUrl" = {
        title    = "GitHub Run URL"
        required = false
        format   = "url"
      }
      "evidenceRef" = {
        title    = "Evidence SHA-256"
        required = false
      }
    }
    number_props = {
      "attemptCount" = {
        title    = "Attempt Count"
        required = false
      }
      "totalDurationSeconds" = {
        title    = "Total Duration (s)"
        required = false
      }
    }
  }

  relations = {
    "workOrder" = {
      title    = "Work Order"
      target   = "workOrder"
      many     = false
      required = false
    }
    "factoryRelease" = {
      title    = "Factory Release"
      target   = "factoryRelease"
      many     = false
      required = false
    }
  }

  depends_on = [port_blueprint.work_order, port_blueprint.factory_release]
}

# ── promotionDecision ─────────────────────────────────────────────────────────
resource "port_blueprint" "promotion_decision" {
  identifier   = "promotionDecision"
  title        = "Promotion Decision"
  icon         = "Alert"
  description  = "An audit-grade record of a release promotion or hold decision."

  properties = {
    string_props = {
      "decision" = {
        title    = "Decision"
        required = false
        enum     = ["PROMOTE", "HOLD", "REJECT"]
        enum_colors = {
          "PROMOTE" = "green"
          "HOLD"    = "yellow"
          "REJECT"  = "red"
        }
      }
      "authorizedBy" = {
        title    = "Authorized By"
        required = false
      }
      "baseVersion" = {
        title    = "Base Version"
        required = false
      }
      "candidateVersion" = {
        title    = "Candidate Version"
        required = false
      }
      "rationale" = {
        title    = "Rationale"
        required = false
      }
      "evaluationSummary" = {
        title    = "Evaluation Summary"
        required = false
        format   = "markdown"
      }
    }
    boolean_props = {
      "allHardGatesPassed" = {
        title    = "All Hard Gates Passed"
        required = false
      }
    }
  }
}

# ── factoryComponent ─────────────────────────────────────────────────────────
resource "port_blueprint" "factory_component" {
  identifier   = "factoryComponent"
  title        = "Factory Component"
  icon         = "Layers"
  description  = "A versioned internal component of the factory (packages, apps, adapters)."

  properties = {
    string_props = {
      "componentType" = {
        title    = "Component Type"
        required = false
        enum     = ["package", "app", "adapter", "client"]
        enum_colors = {
          "package" = "blue"
          "app"     = "green"
          "adapter" = "yellow"
          "client"  = "purple"
        }
      }
      "version" = {
        title    = "Version"
        required = false
      }
      "language" = {
        title    = "Language"
        required = false
      }
      "sha256" = {
        title    = "SHA-256 Digest"
        required = false
      }
    }
  }

  relations = {
    "factoryRelease" = {
      title    = "Factory Release"
      target   = "factoryRelease"
      many     = false
      required = false
    }
  }

  depends_on = [port_blueprint.factory_release]
}

# ── factorySkill ──────────────────────────────────────────────────────────────
resource "port_blueprint" "factory_skill" {
  identifier   = "factorySkill"
  title        = "Factory Skill"
  icon         = "Book"
  description  = "A versioned, locked skill loaded into Claude during a factory stage."

  properties = {
    string_props = {
      "skillId" = {
        title    = "Skill ID"
        required = false
      }
      "factory" = {
        title    = "Factory Stage"
        required = false
        enum     = ["product-requirements", "software-architecture", "software-engineering", "security-compliance", "platform-operations"]
        enum_colors = {
          "product-requirements"    = "blue"
          "software-architecture"   = "purple"
          "software-engineering"    = "yellow"
          "security-compliance"     = "red"
          "platform-operations"     = "green"
        }
      }
      "status" = {
        title    = "Status"
        required = false
        enum     = ["COMPUTED", "PENDING", "REPLACED"]
        enum_colors = {
          "COMPUTED" = "green"
          "PENDING"  = "yellow"
          "REPLACED" = "lightGray"
        }
      }
      "sha256" = {
        title    = "SHA-256 Digest"
        required = false
      }
      "skillMarkdown" = {
        title    = "Skill File"
        required = false
        format   = "markdown"
      }
    }
  }

  relations = {
    "factoryRelease" = {
      title    = "Factory Release"
      target   = "factoryRelease"
      many     = false
      required = false
    }
  }

  depends_on = [port_blueprint.factory_release]
}
