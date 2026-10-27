# What agents add, and what to do instead

Idle costs are rough list prices (AWS us-east-1 unless noted, 2026); check before quoting them.

| Agent adds | Instead | Why |
|---|---|---|
| Kubernetes (EKS/AKS/GKE) | Managed containers (Container Apps, Cloud Run, ECS Fargate, Fly, Render) | Control plane ~$73/month on EKS before any node; small teams leave it over on-call load |
| A module per resource, modules wrapping modules | Resources inline; one module per *kind* used twice or more | Every layer is pass-through variables to debug |
| Terragrunt / workspaces / generators | Copied `test/` and `prod/` folders | One less tool; diffs between envs are visible |
| A variable for every attribute, with validation | Literals; variables only where envs differ | Nobody else sets these values |
| VPC across 3 AZs, NAT per AZ | One zone; one NAT only if private egress is required; free S3/DynamoDB gateway endpoints | ~$32/month per NAT idle, plus $0.045/GB processed |
| Load balancer per service | The platform's built-in ingress, or one shared router with path rules | ~$16–25/month each, idle |
| Separate worker service and image | Same image, different command | One build, one deploy |
| SQS/Kafka/RabbitMQ for background jobs | Postgres table + `FOR UPDATE SKIP LOCKED` | No new system to run; ~0.3 ms vs ~0.1 ms latency rarely matters |
| Redis "for caching" | Nothing until a measured slow query; then an index | Managed Redis bills per hour |
| DynamoDB next to Postgres | A Postgres table (JSONB if needed) | Two databases = two backups, two access models |
| Elasticsearch/OpenSearch | Postgres full-text (`tsvector`), `pg_trgm` | A search cluster is a full-time job |
| Pinecone/Weaviate | `pgvector` | Same database, same backup |
| Secrets Manager + rotation lambdas | Key vault/secret store with placeholder + `ignore_changes`, set once by hand | Rotation code is code to debug |
| Custom KMS key per resource | Provider-managed encryption; a custom key only where a threat model needs one | $1/month per key plus calls, and key policies to get wrong |
| Always-on staging + per-PR previews | One small test env, scaled to zero when idle | Idle most of the day |
| Datadog/New Relic | Platform logs (CloudWatch/Log Analytics) + a free-tier error tracker + one uptime check | Bills by host, metric and GB; 3–10× budget reported |
| Dozens of alarms and dashboards | Three alerts: down, error rate, spend | Nobody reads the rest |
| Multi-account landing zone, Control Tower | One account per environment at most | Org setup is weeks of work for no user value |
| Multi-region, read replicas | One region; tested restore from backup | Doubles cost and failure modes |
| Lambda chains / Step Functions for a pipeline | One worker process | Prime Video cut cost 90% doing exactly this |
| Terraform for DNS verification, state bucket, secret values | One CLI line in the README | Happens once |
| CI that runs `apply` on every push to every env | `plan` on PRs, `apply` on merge to main | Fewer surprises |
| Agent loop with no limits | Max iterations, per-run budget, per-key credit cap, timeouts | Alerts don't stop a loop |
