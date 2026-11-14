provider "port" {
  client_id     = var.port_client_id
  secret        = var.port_client_secret
  base_url      = var.port_base_url
}

provider "github" {
  token = var.github_token
  owner = var.github_owner
}
