output "port_blueprints" {
  description = "All Port blueprint identifiers created"
  value = [
    port_blueprint.service.identifier,
    port_blueprint.work_order.identifier,
    port_blueprint.factory_release.identifier,
    port_blueprint.factory_run.identifier,
    port_blueprint.promotion_decision.identifier,
    port_blueprint.factory_component.identifier,
    port_blueprint.factory_skill.identifier,
  ]
}

output "port_seed_entities" {
  description = "Seed entities created"
  value = [
    port_entity.factory_release_140.identifier,
    port_entity.factory_release_150.identifier,
    port_entity.service_billing_api.identifier,
    port_entity.service_notification_api.identifier,
    port_entity.work_order_billing_invoice.identifier,
    port_entity.work_order_notification_schema.identifier,
  ]
}

output "consumer_repos_protected" {
  description = "GitHub repos with branch protection requiring factory-contract/acceptance"
  value = [
    "${var.github_owner}/${var.billing_repo_name}",
    "${var.github_owner}/${var.notification_repo_name}",
  ]
}

output "next_steps" {
  description = "What to do after apply"
  value = <<-EOT
    ✓ Terraform apply complete.

    Next steps:
    1. Set GitHub secrets: cd infra/github && ./store-app-secrets.sh
    2. Run bootstrap: pnpm bootstrap
    3. Run doctor:   pnpm factory doctor --profile local-dev
    4. Run factory:  pnpm factory run --work-order wo-billing-invoice-export-001 --release 1.4.0
  EOT
}
