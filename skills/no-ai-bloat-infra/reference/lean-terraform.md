# A lean setup, worked

The pattern below comes from a production Terraform setup a senior engineer wrote and reused
across three products on Azure. It runs a frontend, an API, a background worker, Postgres,
Redis, file storage, secrets, a CDN/router and logs, for two environments, in about 4,000 lines.
The snippets are rewritten from the patterns; names are generic.

## Layout

```
infra/
  bootstrap/create-state-storage.sh   # run once by hand
  test/
    shared/      # resource groups, network, registry, container environment, logs, router
    data/        # one Postgres server, key vault
    apps/myapp/  # this app's database, redis, storage, containers, routes
    modules/     # app_container, postgres, redis, key_vault, storage, router, insights
  prod/          # a copy of test/ with different numbers
```

Three stacks per environment (shared → data → app), read through `terraform_remote_state`.
`test/` and `prod/` are plain copies. Duplication is the point: no tool to learn, and a change
can be tried in test, then copied.

## One container module, three uses

```hcl
module "api" {
  source       = "../../modules/app_container"
  name         = "myapp-api"
  image        = "${local.registry}/myapp-api:latest"
  target_port  = 8000
  cpu          = 1
  memory       = "2Gi"
  min_replicas = 2
  max_replicas = 5
}

# The worker is the API image with another command: no second image, no second service.
module "worker" {
  source          = "../../modules/app_container"
  name            = "myapp-worker"
  image           = "${local.registry}/myapp-api:latest"
  command         = ["celery", "-A", "app.worker", "worker", "--concurrency=1"]
  ingress_enabled = false
  cpu             = 1
  memory          = "2Gi"
  min_replicas    = 1
  max_replicas    = 2
}
```

The frontend is the same module with 0.25 CPU and 0.5 GiB.

## Secrets: placeholder, then by hand

```hcl
# Set the real value once:  az keyvault secret set --vault-name <kv> --name LLM-API-KEY --value <key>
resource "azurerm_key_vault_secret" "llm_api_key" {
  name         = "LLM-API-KEY"
  value        = "REPLACE_ME"
  key_vault_id = module.key_vault.id
  lifecycle { ignore_changes = [value] }
}
```

Connection strings Terraform already knows (database, storage, Redis) are passed straight in as
container secrets. There's no secret pipeline and no rotation lambda.

## One database server for everything

```hcl
resource "azurerm_postgresql_flexible_server_database" "myapp" {
  name      = "myapp"
  server_id = local.data.postgres_id   # the shared server
}
```

One zone, 7-day backups, 32 GB storage, the smallest SKU that works. It isn't reachable from the
internet: a private endpoint in the network. That is the security line, and it isn't cut.

## Small escape hatches

```hcl
# Role assignments take a while to apply; wait instead of writing retry logic.
resource "time_sleep" "wait_for_kv_rbac" {
  depends_on      = [azurerm_role_assignment.kv_secrets_officer]
  create_duration = "60s"
}
```

A `null_resource` with one CLI call where the provider has no resource. Two lines, not a
custom provider.

## How it grew

From the git history: the worker was added as one container; sized up (0.5 → 1 CPU) when it
struggled; kept at `min_replicas = 1` "until the queue scale rule is added"; queue-based
autoscaling was then tried in test and copied to prod. **Each step answered a measured problem.**

## What it doesn't have

No Kubernetes, no Terragrunt, no workspaces, no multi-region, no read replicas, no separate
staging besides test, no paid observability (the platform's log workspace with 30-day
retention, plus App Insights), no custom module registry.

## Its gap

The README says the shared stack has a budget, but there is no budget resource in the code.
Review mode exists to catch exactly that.
