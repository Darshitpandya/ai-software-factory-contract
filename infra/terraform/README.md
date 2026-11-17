# infra/terraform

Terraform configuration for the Port control plane and GitHub branch protection.

→ [Root README](../../README.md#port-setup) for the full setup sequence.

---

## What is here

| File | What it creates |
|------|----------------|
| `blueprints.tf` | 7 Port blueprints: `service`, `workOrder`, `factoryRelease`, `factoryRun`, `promotionDecision`, `factoryComponent`, `factorySkill` |
| `entities.tf` | Seed entities: two factory releases (1.4.0 ACTIVE, 1.5.0 CANDIDATE), two services, two work orders |
| `github.tf` | Branch protection on consumer repos requiring `factory-contract/acceptance` check |
| `providers.tf` | Port and GitHub provider configuration |
| `variables.tf` | Input variables (Port credentials, GitHub token, repo names) |
| `outputs.tf` | Prints what was created |
| `versions.tf` | Provider version pins |
| `terraform.tfvars.example` | Copy this to `terraform.tfvars` and fill in your values |

## First time

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — add your Port client ID/secret, GitHub token, GitHub username

terraform init
terraform plan    # review what will be created
terraform apply   # create everything
```

## What you bring

- Your own Port org credentials (`port_client_id`, `port_client_secret`)
- Your own GitHub token with `repo` and `administration` scope
- Your own GitHub username or org name (`github_owner`)
- Your own repo names if you forked the consumer repos

## State file

`terraform.tfstate` is in `.gitignore` — it may contain credentials. Never commit it. For a team, use a remote backend (S3, Terraform Cloud, etc.).
