---
name: obsidian-ops
description: "Use for Mechi Obsidian vault search, note capture, durable operator memory, meeting notes, and internal runbooks from the OpenClaw control agent."
metadata:
  owner: mechi
  version: "0.1.0"
---

# Obsidian Ops

This workspace is wired to use a dedicated Mechi Obsidian vault on the OpenClaw host.

Use this skill when the Boss asks you to:

- save or recall operator notes
- keep a durable running memory of decisions, incidents, or follow-ups
- capture meetings, handoffs, or rollout notes
- maintain internal runbooks or people notes
- search prior internal notes before repeating work

## Canonical commands

Run these from the repo root when possible:

```bash
./scripts/openclaw-obsidian.sh print-default --path-only
./scripts/openclaw-obsidian.sh search-content "query"
./scripts/openclaw-obsidian.sh print "Ops/Mechi COO Dashboard"
./scripts/openclaw-obsidian.sh create "Inbox/New note" --content "# Title\n\nBody"
./scripts/openclaw-obsidian.sh move "Inbox/New note" "Ops/Structured note"
```

## Recommended vault structure

- `Inbox/` for quick capture before sorting
- `Daily/` for date-based operating notes
- `Ops/` for decisions, incidents, and runbooks
- `Product/` for product state and rollout notes
- `Support/` for support patterns or policy references
- `Infra/` for host, deployment, or integration notes
- `People/` for operator-specific context
- `Meetings/` for structured recaps

## Rules

1. Prefer `./scripts/openclaw-obsidian.sh` over raw `obsidian-cli`.
2. Treat Obsidian as internal memory, not as the source of truth for live production state unless a note cites a verified source and date.
3. Avoid `--open` unless the Boss explicitly asks, because the host is headless.
4. Do not edit `.obsidian/` config unless the Boss explicitly asks for vault configuration work.
5. Keep notes concise, dated when relevant, and easy to skim later.
