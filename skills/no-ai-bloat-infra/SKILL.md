---
name: no-ai-bloat-infra
description: Use before writing, changing or reviewing infrastructure — Terraform, CDK, Pulumi, Bicep, docker compose, Kubernetes YAML, CI deploy pipelines — and before adding any cloud resource, database, queue, cache, worker, environment, region or paid API; also when the user says deploy, host, go live, infra, scale, or "set up AWS/Azure/GCP". Keeps infrastructure lean by taking deliberate shortcuts (copy a proven setup, managed services, reuse, do one-off things by hand), demands an idle-cost receipt and hard spending caps, and bans heavyweight patterns unless a measured problem forces them.
---

# No AI bloat infra

AI writes infrastructure the way big companies run it, because that is what its training data
shows: module frameworks, a variable for every attribute, networking for three availability
zones, a queue, a cache, a staging copy, dashboards. It looks professional, it bills every hour,
and nobody on a small team can change it a month later.

Lean infrastructure comes from **shortcuts taken on purpose**. The goal is an app that is fully
operational, secure, and small enough that one person understands all of it.

## The rules

**1. Start from what the app needs, as nouns.**
Web, API, worker, database, files, secrets, domain, logs. Usually fewer than ten. Each noun gets
**one managed service**. Nothing exists until a noun needs it.

**2. Copy before you design.**
If a working setup exists (in this repo, a sibling repo, or the team's boilerplate), copy it and
change names and numbers. Never write a new module framework. A copied setup has already been
debugged in production; a new one hasn't.

**3. Reuse before you add.**
- A worker is the API's image with a different start command. Not a second image or service.
- A queue is a Postgres table with `FOR UPDATE SKIP LOCKED`, or the Redis you already run.
- Cron is the platform's scheduler or `pg_cron`. Not a new service.
- A cache is nothing, until a measurement says a query is too slow.
- Search is Postgres full-text; vectors are `pgvector`. Not a second database.
- One database server for all apps, one database (or schema) per app.

**4. Write flat Terraform.**
- One module per *kind* of thing (container app, database), reused with different numbers.
  Never a module per resource, never modules wrapping modules.
- Environments are copied folders (`test/`, `prod/`). No Terragrunt, workspaces, generators or
  wrapper scripts.
- A variable only for what differs between environments. Everything else is a literal.
- No `for_each` over a map with one entry, no `dynamic` blocks for one block, no validation
  blocks on values only we set, no outputs nobody reads.

**5. Do by hand what happens once.**
Secret values, DNS verification records, the state bucket, enabling a provider, a domain's
first certificate. A CLI line in the README beats a hundred lines of HCL. For secrets: create
them in Terraform with a placeholder value and `ignore_changes = [value]`, then set the real
value once by hand.

**6. Terraform describes shape, not releases.**
CI builds and pushes images; containers pull the tag CI sets. Don't make every deploy a
Terraform change.

**7. Cut corners on operations, never on security boundaries.**
Fine: one region, one zone, small sizes, short log retention, 7-day backups, no read replicas.
Not fine: a database or cache reachable from the internet, admin keys in code or state committed
to git, IAM with `*` on everything, no TLS.

**8. Every resource states its idle cost.**
Before adding a resource, write what it costs per month at **zero traffic**. Watch for things
that bill while idle: NAT gateways (~$32/month on AWS before traffic), load balancers, minimum
replicas above zero, managed caches billed per hour, always-on staging and preview environments.

**9. Caps, not alerts, on everything metered.**
Alerts tell you after the money is gone (one agent loop ran 11 days to $47k with monitoring on).
- LLM keys: a per-key credit limit (OpenRouter's is off by default; turn it on), one key per
  environment, and a max-iterations and per-run budget in any agent loop.
- Platforms with a hard cap: turn it on (Supabase spend cap, Vercel "pause projects").
- AWS and GCP have **no hard cap**. Say so out loud, set a budget with an action, and keep keys
  short-lived and scoped.

**10. Growth needs a number.**
Adding a service, replica, region, environment or tool needs all four in writing:
the **measured problem**, the **cheaper fix already tried**, the **cost at idle and at 10×**,
and **who fixes it at 3 a.m.** Without them it waits. Add it in test first, then prod.

## Banned by default

Each needs rule 10 before it appears: Kubernetes (EKS/AKS/GKE), microservices, a service mesh,
Kafka or another separate message broker, multi-region, multi-AZ, a NAT per AZ, a staging
environment that runs all the time, preview environments with their own databases, a paid
observability suite (Datadog and similar), custom KMS keys per resource, landing zones and
multi-account org setups, Terraform wrappers (Terragrunt, CDK-for-Terraform layers), GitOps
controllers, and a self-hosted anything a managed service already does.

## Before applying: the infra receipt

Post this in chat and in the PR **before** `terraform apply` or its equivalent. Any new resource
that bills while idle needs the user's OK.

```
Needs:      web, api, worker, postgres, files, secrets, domain
Resources:  23 resources, ~600 lines of Terraform, 3 modules
Idle cost:  ~$X/month   (largest: postgres $A, redis $B, nat $C)
By hand:    3 secret values, DNS TXT record, state bucket
Caps:       OpenRouter key $50/month (hard); Azure budget alert $Y (no hard cap exists)
Not added:  staging (test env is enough), Kafka (Postgres queue), multi-AZ
```

## Review mode

Given existing infrastructure ("review our infra", a PR with `.tf` files):

1. Count resources, modules and lines; list the nouns the app actually uses.
2. Give each resource its idle monthly cost; sum them.
3. Flag every break of rules 3–10 and every banned item, with the file and line.
4. Check that what the docs promise exists (a README "budget" with no budget resource).
5. Propose cuts in order of money saved, each with its risk. Change nothing unless asked.

## Red flags

| Thought | Instead |
|---|---|
| "A module makes this reusable" | Is it used twice today? If not, write the resource. |
| "Let's make every value a variable" | Variables only for what differs between environments. |
| "Production needs multi-AZ" | Does a measured outage say so? One zone, backups, a restore you've tried. |
| "We'll need a queue" | A Postgres table with SKIP LOCKED until it measurably can't keep up. |
| "Add Redis for caching" | Which query is slow, and by how much? |
| "Separate service for the worker" | Same image, different command. |
| "Staging should mirror prod" | One test env, small, scaled to zero when possible. |
| "Let's automate the secrets" | Placeholder + `ignore_changes`, set once by hand. |
| "Set up Datadog" | The platform's own logs, plus one error tracker on a free tier. |
| "Budget alerts are enough" | Alerts aren't caps. Set the hard cap, or say none exists. |
| "This is how big companies do it" | They have a platform team. We have nobody on call. |

## References

- [reference/lean-terraform.md](reference/lean-terraform.md): a worked lean setup and its snippets
- [reference/bloat-catalog.md](reference/bloat-catalog.md): what agents add, what to do instead, what it costs
- [reference/research.md](reference/research.md): incidents and sources behind every rule
