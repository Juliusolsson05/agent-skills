#!/usr/bin/env node
// Compares each pinned external skill against its upstream branch head and
// prints a markdown report of the ones that moved.
//
// WHY detect-only: an upstream skill change is an instruction change for every
// agent that loads it. A bot that auto-bumped `pinned` would silently change
// agent behaviour, so this only reports; a human reads the diff and bumps the
// pin by hand (same doctrine as agent-code's support/upstream-versions.json).
//
// WHY the GitHub REST API and no dependencies: runs on a bare Actions runner
// with Node 22+ (global fetch). GITHUB_TOKEN is optional locally but avoids the
// 60 req/h anonymous limit in CI.
import { readFileSync, appendFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(new URL('../external-skills.json', import.meta.url), 'utf8'))
const headers = { accept: 'application/vnd.github+json', 'user-agent': 'agent-skills-external-watch' }
if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`

async function api(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers })
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json()
}

const drift = []
for (const s of manifest.skills) {
  const head = await api(`/repos/${s.repo}/commits/${encodeURIComponent(s.branch)}`)
  if (head.sha === s.pinned) continue
  // Only commits that touched the skill folder matter; README/translation
  // churn upstream is noise. `compare` lists files, so filter on `path`.
  const cmp = await api(`/repos/${s.repo}/compare/${s.pinned}...${head.sha}`)
  const touched = (cmp.files ?? []).filter(f => f.filename.startsWith(`${s.path}/`))
  if (touched.length === 0) continue
  drift.push({ s, head: head.sha, touched, url: cmp.html_url })
}

const lines = drift.length === 0
  ? ['No external skill changed since its pin.']
  : drift.flatMap(({ s, head, touched, url }) => [
      `## ${s.name} (${s.repo})`,
      `Pinned \`${s.pinned.slice(0, 7)}\` → upstream \`${head.slice(0, 7)}\`. [Diff](${url})`,
      '',
      ...touched.map(f => `- \`${f.filename}\` (${f.status}, +${f.additions}/-${f.deletions})`),
      '',
      'Read the diff, then bump `pinned` in `external-skills.json` (and reinstall in Agent Code) or note why not.',
      '',
    ])

console.log(lines.join('\n'))
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `drift=${drift.length > 0}\n`)
