# agent-skills

My process skills for AI coding agents (Claude Code, Codex, OpenCode). They
replace the [superpowers](https://github.com/obra/superpowers) plugin with a
leaner workflow built from how I actually work: months of real sessions,
~200 plans, ~35 decomposition docs and the bugs that got misdiagnosed along
the way.

| Skill | Use it for |
|---|---|
| [`writing-plans`](skills/writing-plans/SKILL.md) | Any feature, fix or refactor that lands as a PR: read first, confirm understanding, decisions with defaults, plan as the first commit, build it all, keep the plan true |
| [`debugging`](skills/debugging/SKILL.md) | Bugs, regressions, flaky tests, crashes, OOM: evidence first, root cause before fix, regression test from recorded data proven by reverting the fix |
| [`staged-decomposition`](skills/staged-decomposition/SKILL.md) | Risky work: several sources of truth, a stalled 40–70% attempt, an unrecorded subsystem. Evidence → catalog → stages, tests from real recordings |
| [`pr-review`](skills/pr-review/SKILL.md) | One round of independent read-only reviewers, findings triaged against the code, merge only on explicit approval |
| [`smallest-live-test`](skills/smallest-live-test/SKILL.md) | Before any slow run (pipeline, model run, eval, benchmark, full suite, CI): the smallest real test that answers the question, in the background with a hard limit, every failure found in one pass |
| [`no-ai-bloat-infra`](skills/no-ai-bloat-infra/SKILL.md) | Any Terraform, deploy or new cloud resource: copy a proven setup, managed services, reuse before adding, one-off things by hand, an idle-cost receipt and hard spending caps; heavyweight patterns only when a measured problem forces them |

## How they fit

```
request
  ├─ trivial ─────────────────────────► just do it
  ├─ bug / flaky / crash ─────────────► debugging ──(2 failed fixes)──┐
  ├─ risky / unknown case set ────────► staged-decomposition ◄────────┘
  │                                          │ approved
  └─ feature / refactor, known shape ─► writing-plans (tasks = stages)
                                             │
                        read a lot → recite + decisions → plan commit
                        → build all of it → tests from real data
                        → pr-review (one round) → PR → wait for "merge"
```

## Install

With Agent Code: Settings → Skills → install from GitHub →
`Juliusolsson05/agent-skills`, pick the skills, choose the providers.
Installing to both skill roots makes them visible to Claude Code and Codex.

Anywhere else, with the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add Juliusolsson05/agent-skills
```

Or copy `skills/<name>/` into `~/.claude/skills/` or `~/.agents/skills/`.

## Extensions

Slash commands rather than skills: they run only when you type them, so they
never trigger on their own. They live in [`extensions/`](extensions/).

| Command | Use it for |
|---|---|
| [`/simple-code`](extensions/simple-code.md) | Push the agent towards simple, boring, obvious code instead of clever abstractions |
| [`/llm-prep`](extensions/llm-prep.md) | Dump a codebase (or the paths you name) into one markdown file in `file-dumps/` for pasting into another LLM |

Install by copying them into `~/.claude/commands/` (Claude Code).

## External skills I use

These live in other repos and are listed in [`external-skills.json`](external-skills.json)
with the commit I last reviewed. A weekly workflow opens an issue when upstream
changes the skill, so I read the diff before my agents follow new instructions.

| Skill | Source | Why |
|---|---|---|
| `i-have-adhd` | [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd) | Answer first, number steps, restate state, cut tangents |

## Background

The staged-decomposition skill comes from the essay
[Misadventures in Agentic Development](https://www.juliusolsson.com/blog/agentic-development).
It previously lived at `Juliusolsson05/staged-decomposition`, which now points here.

## License

MIT
