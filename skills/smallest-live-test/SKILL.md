---
name: smallest-live-test
description: "Use before running anything slow to check whether a change works: a pipeline run, a model or LLM run, a benchmark, an eval, a backfill, a full test suite, a build-and-run, a soak; and whenever the user says test it, try it live, run it, does it work, is it faster, compare models, or evaluate. Picks the smallest live test that answers the question on real data, runs it in the background with a hard time limit, and reports early. Optimizes for speed and agility in autonomous development without skipping real testing."
license: MIT
---

# Smallest live test

In autonomous development the most expensive mistake is a long run that answers
the wrong question: a full pipeline in the background for four hours, then the
discovery that the approach never worked. The cost is not the compute. It is the
hours nobody could change direction.

So optimize for **time to a trustworthy answer**. That never means testing less
or testing on fake data. Real data and live runs stay mandatory. It means the
smallest real run that gives the full answer.

## The rule

Before starting anything that takes more than about two minutes, write down in
one line:

1. **The question** this run answers ("do the fixes stop chats being rejected?").
2. **The smallest real input** that answers it fully.
3. **The expected time**, and the **kill time** (about 2× expected, hard cap).
4. **What you will do with each possible result.**

If you cannot fill in 4, the run is not ready. Do not start it.

## Picking the smallest input

- **Pick the cases that decide the question, not a sample.** The chats that
  failed last time, the one pair that should match, the slowest file. Four
  well-chosen real cases beat four hundred random ones.
- **Include one known-good case** as a control, so a pass is not an accident of
  the data.
- **Cut stages you are not testing.** Testing analysis? Skip matching. Testing
  matching? Reuse stored analysis (recordings, cached replies, a saved database)
  instead of re-running the whole pipeline.
- **Scale up only after the small run passes**, and only in steps (4 → 15 →
  everything). Each step must answer a new question, such as throughput or cost
  at scale. Repeating the same answer bigger is not a step.
- **Compare like with like.** Measure the baseline on the same small input (old
  traces, a recorded run). Don't compare 4 chats now with 15 chats then.

## Running it

- **Always run it in the background** with a hard limit (`perl -e 'alarm 300;
  exec @ARGV' cmd …` on macOS, `timeout` on Linux), and say the kill time out loud.
- **Watch progress, not just the exit code.** Before starting, know where the
  progress is visible: a live trace, a job table, a log line per item. If nothing
  shows progress, add that first. It is usually a few lines.
- **Check the first result early.** Look at the first finished item within a
  minute or two. A wrong first item means kill the run now, not after the rest.
- **Run independent work in parallel**: build while you prepare inputs, run
  targeted tests while the live run goes, prepare the report while waiting.
- **Use the tool's parallelism** when the work allows it (several calls in
  flight, several items at once). Check that parallel results are kept, not
  thrown away and redone.
- **Never block the main loop.** If a step is slow and nothing else can happen
  until it finishes, reconsider the step.

## Tests

- Run **only the tests for the code you touched** while iterating. The full
  suite is for the end, before merge.
- A test failure in the environment (proxy, sandbox, OS) is not a code failure.
  Prove which one it is with one quick rerun, then move on and record it.

## CI is a slow run too

CI is exactly the trap this skill exists for: a 40-minute pipeline, pushed and
awaited three times, each round finding one new failure. Before pushing to CI
and waiting on it:

1. **Know how long it takes and where the time goes.** Read the last run's step
   durations (`gh run view <id> --json jobs`) and, for tests, the time per test
   file. Separate compile time from test run time; they need different fixes.
2. **Find every failure in one pass, not one per round.** CI steps stop at the
   first failure, so a red run hides everything after it. Check locally, or in
   CI with `--no-fail-fast` and steps that keep going, which paths, files and
   environment the later steps need (private submodules, secrets, generated
   files, OS differences), and fix them all before the next push.
3. **Make the pipeline fast before waiting on it again** when one run takes more
   than ~10 minutes:
   - cache dependencies and build output (e.g. `Swatinem/rust-cache`);
   - split into parallel jobs (lint, unit tests, slow integration, SDKs,
     walkthroughs), so wall time is the slowest job, not the sum;
   - run slow test files optimized or in their own job, and find why a single
     test file takes minutes (unoptimized heavy work, real sleeps, oversized
     fixtures) instead of accepting it;
   - remove build settings that serialize compilation (e.g. `codegen-units = 1`)
     unless there is a measured reason.
4. **Never push a fix and passively wait 40 minutes.** If a run is long, use
   the time to reproduce the remaining steps locally, or make the pipeline faster.

## Stop and rethink when

- The run passes its expected time with no visible progress. Kill it, find out
  why, then start a smaller one.
- You are about to start the same long run a second time. Something about the
  question or the input is wrong. This includes re-running CI after a one-line
  fix: first make sure the next run can't fail on something you could have
  found now.
- The run would cost real money or more than ~15 minutes. Say so to the user
  first, with the question it answers and the smaller alternative.

## Report

Lead with the answer to the question, then the numbers on the same input as the
baseline: time, cost, items passed or failed, and the exact failures. State what
the small run does not prove (for example "throughput at 1,000 chats not
measured"), and what the next, larger step would answer.

## Example

> Question: do bundle-2's fixes stop p04's chats being rejected?
> Input: the 4 p04 chats that failed last run (78 messages), analysis plus
> documents; matching is irrelevant with one person.
> Expected 2 min, kill at 5. Baseline: the same 4 chats in the old engine's
> trace. If 4/4 pass, go to all 15 for timing; if any fail, read its diagnostic
> before anything else.
