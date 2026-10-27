# Research behind no-ai-bloat-infra (27 Oct 2026)

Web research for the skill. Most sources are practitioner blogs or vendor posts; figures are
self-reported unless marked. What matters for the skill is the pattern, not the exact dollars.

## 1. Agents over-build by default

- Agents are "locally correct but architecturally blind": polished, tested code that ignores the
  system ([levelup.gitconnected](https://levelup.gitconnected.com/the-code-passed-every-test-the-system-still-burned-10b1eb952ec9)).
- AI tools "solve problems the way the training data solved them, which usually means reaching for
  a library instead of writing twenty lines" ([Claude Code Conversations podcast](https://www.iheart.com/podcast/269-claude-code-conversations-321257731/episode/why-does-ai-generated-code-pull-in-340059247/)).
- Assistants add helpers, validation and restructuring when a minimal fix was asked
  ([feedbagel](https://feedbagel.com/post/ai-coding-assistants-often-over-engineer-simple-bug-fixes)).
  A Cursor session asked to fix one auth bug rewrote user management, added tables, ~2,800 lines
  ([SmarterArticles](https://smarterarticles.co.uk/the-real-cost-of-vibe-coding-when-ai-over-delivers-on-your-dime)).
- An AI-written dashboard raised DB compute ~$12k/month (nested loops instead of one join)
  ([Ravoid](https://ravoid.com/blog/vibe-coding-technical-debt), unverified).
- AI-generated Terraform creates resources but misses IAM boundaries
  ([Azilen](https://www.azilen.com/learning/vibe-coding-cost/)).
- Training data is dominated by big-company architecture (Google/Netflix patterns); that is the
  "scale assumption mismatch" ([softwareseni](https://www.softwareseni.com/why-ex-google-engineers-over-architecture-everything-understanding-scale-assumption-mismatch);
  [InfoWorld](https://www.infoworld.com/article/3116404/googles-infrastructure-for-everyone-else.html):
  "a Formula One car for the school run").

## 2. Big companies walked it back

- **Prime Video**: Step Functions + Lambda hit a scaling limit at ~5% of expected load; one ECS
  task cut infra cost by over 90% ([The Stack](https://www.thestack.technology/amazon-prime-video-microservices-monolith/)).
- **Segment**: 140 services back to one monolith ([Docker blog](https://docker.com/blog/do-you-really-need-microservices)).
- **37signals**: $3.2M/yr cloud budget; ~$600k of servers; ~$7M saved over five years, same team
  size; deploys with Kamal ([DHH, cloud exit FAQ](https://world.hey.com/dhh/the-big-cloud-exit-faq-20274010);
  [Kamal](https://world.hey.com/dhh/our-switch-to-kamal-is-complete-8e0de22e)).
- **Kubernetes regret, small teams**: a 4-engineer team with ~8k users turned Kubernetes off after
  years of YAML and 2 a.m. pages ([Stackademic](https://blog.stackademic.com/i-stopped-using-kubernetes-for-my-startup-heres-what-replaced-it-7d9d53ef3693)).
  The trigger is on-call load and one-person knowledge, not traffic
  ([Product Hunt thread](https://www.producthunt.com/p/general/when-does-kubernetes-actually-become-worth-it-for-a-startup)).

## 3. One box goes very far

- Photo AI: vanilla PHP + SQLite + jQuery on one VPS, ~$100k+ MRR (secondary sources disagree
  on the VPS: ~$40 to $384/month) ([Indie Hackers](https://www.indiehackers.com/post/photo-ai-by-pieter-levels-complete-deep-dive-case-study-0-to-182k-mrr-in-18-months-3a9a2b1579);
  [andrew.ooo](https://andrew.ooo/posts/pieter-levels-photo-ai-solo-founder/)).
- SQLite in WAL mode handles a single-server app; the limits are many writers and many machines
  ([Consider SQLite](https://blog.wesleyac.com/posts/consider-sqlite);
  [binaryigor](https://binaryigor.com/sqlite-db-simple-in-process-reliable-fast.html)).
- Postgres covers the extras: queues with `FOR UPDATE SKIP LOCKED`, cache with UNLOGGED tables,
  `pg_cron`, `pgvector`, `tsvector` search. Dedicated brokers win only at high throughput,
  complex routing or many teams ([bitdoze](https://www.bitdoze.com/what-postgres-replaces/);
  [Conduktor](https://www.conduktor.io/glossary/kafka-vs-postgres.md)).
  Redis BRPOP ~0.1 ms vs SKIP LOCKED ~0.3 ms: negligible for most apps.
- Choose boring technology: about three innovation tokens; boring = well understood by *this team*
  ([McKinley](https://mcfunley.com/choose-boring-technology);
  [Matt Rickard](https://mattrickard.com/innovation-tokens)).
- Do things that don't scale: manual first, automate when the pattern is clear; "anything you do
  daily or less that saves 30 minutes or less is not worth a week"
  ([nofluffengineer](https://nofluffengineer.substack.com/p/do-engineering-things-that-dont-scale)).

## 4. How bills explode

- Lambda fed by its own output: $10k over a weekend ([DEV postmortem](https://dev.to/chrlie/the-bug-that-cost-us-10000-a-postmortem-on-a-rogue-aws-lambda-function-2m28)).
- Cara on Vercel Functions: ~$98k after going viral; leaked GCP key: $450k in 45 days; Firebase
  dashboard 24 h behind: $72k ([OpenMetal](https://openmetal.io/resources/blog/case-study-450k-gcp-public-cloud-bill/);
  [goodtechthings](https://newsletter.goodtechthings.com/p/the-cloud-billing-risk-that-scares)).
- Agent loop: two LangChain agents talking for 11 days, $47k, despite logging and monitoring;
  "alerts are not enforcement" ([DEV](https://dev.to/waxell/the-47000-agent-loop-why-token-budget-alerts-arent-budget-enforcement-389i)).
  Context grows per step (~80k-token inputs by step 30), so cost compounds even without a loop
  ([MachineLearningMastery](https://machinelearningmastery.com/blog/identifying-token-costs-hiding-in-your-agentic-loop/)).
- Idle AWS costs: a NAT gateway is ~$32/month with zero traffic plus $0.045/GB; AWS-to-AWS
  traffic (S3, ECR, CloudWatch) goes through it unless free gateway endpoints are added; idle
  load balancers ~$20–25/month ([open-edge](https://open-edge.io/?p=708);
  [spendark](https://spendark.com/blog/aws-nat-gateway-pricing/)).
- Always-on staging/preview environments sit idle most of the day; Flexera: ~28% of cloud spend
  is idle or underused ([temps.sh](https://temps.sh/blog/how-to-implement-scale-to-zero-dev-environments);
  [freeCodeCamp FinOps](https://www.freecodecamp.org/news/the-aws-finops-guide-for-series-a-startups/)).
- Observability: Datadog bills logs, metrics, hosts separately; invoices 3–10× budget reported
  ([DEV](https://dev.to/epok/datadog-alternatives-for-small-teams-2026-1edg)).

## 5. Caps: which exist

- **AWS / GCP: no hard cap.** AWS Budget actions (attach IAM/SCP, stop EC2/RDS) fire after the
  fact; cost data lags ~8–12 h ([AWS docs](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/budgets-controls.html);
  [AWS blog](https://aws.amazon.com/blogs/mt/manage-cost-overruns-part-1)).
- **Vercel**: a hard cap only with "pause projects" on; triggers minutes late
  ([Vercel](https://vercel.com/docs/spend-management)).
- **Supabase**: spend cap on by default on Pro ([Supabase billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)).
- **OpenRouter**: optional per-key credit limit, unset by default, can reset on a schedule
  ([OpenRouter limits](https://openrouter.ai/docs/api-reference/limits)).

## 6. Buy the commodity

- Buy auth, payments and email; build only the moat. Most build-cost numbers come from vendors
  ([Smirnov Labs](https://smirnovlabs.com/blog/build-vs-buy);
  [Clerk](https://clerk.com/articles/build-vs-buy-authentication-the-real-cost-of-rolling-your-own-auth)).
- Hetzner vs AWS: ~42% cheaper compute, 20 TB egress included, but no managed Postgres
  ([spendark](https://spendark.com/blog/cloud-tax-price-comparison-2026/);
  [selfhost.dev](https://selfhost.dev/aws-rds-vs-hetzner-cloud-cost/)).

## Not found

- No study measuring how much infrastructure AI agents add compared with humans.
- The "grug brain developer" essay (Carson Gross) didn't come up in search; cited from memory.
- Anthropic's own "avoid over-engineering" guidance wasn't found verbatim.
