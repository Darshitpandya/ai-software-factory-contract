variable "port_client_id" {
  type        = string
  description = "Port client ID (from app.getport.io → Settings → Credentials)"
}

variable "port_client_secret" {
  type        = string
  sensitive   = true
  description = "Port client secret"
}

variable "port_base_url" {
  type        = string
  default     = "https://api.getport.io"
  description = "Port API base URL"
}

variable "github_token" {
  type        = string
  sensitive   = true
  description = "GitHub personal access token with repo:read scope"
}

variable "github_owner" {
  type        = string
  description = "GitHub org or user owning the repos (e.g. Darshitpandya)"
}

variable "billing_repo_name" {
  type        = string
  default     = "factory-reference-billing-api"
  description = "Name of the billing consumer repo"
}

variable "notification_repo_name" {
  type        = string
  default     = "factory-reference-notification-api"
  description = "Name of the notification consumer repo"
}
