---
name: github-ops
description: "Use for Mechi GitHub repo metadata, issues, pull requests, Actions runs, and release checks from the OpenClaw control agent."
metadata:
  owner: mechi
  version: "0.1.0"
---

# GitHub Ops

This workspace is wired to use GitHub CLI for repo-aware operations.

Use this skill when the Boss asks about:

- repo visibility or default branch
- open issues
- PR status
- workflow or CI status
- release tags
- GitHub comments, reviews, or issue triage

## Canonical commands

Run these from the repo root when possible:

```bash
./scripts/openclaw-gh.sh repo view --json name,visibility,defaultBranchRef,viewerPermission
./scripts/openclaw-gh.sh issue list --state open --limit 10 --json number,title,state
./scripts/openclaw-gh.sh pr status
./scripts/openclaw-gh.sh run list --limit 10
```

If you explicitly need a repo-scoped command outside the repo root, use:

```bash
./scripts/openclaw-gh.sh --exec 'gh issue list -R "$GH_REPO" --state open --limit 10 --json number,title,state'
```

## Rules

1. Prefer `./scripts/openclaw-gh.sh` over raw `gh` or direct API calls for normal GitHub operations.
2. The wrapper auto-loads GitHub auth env and auto-detects `GH_REPO` from the repo remote when possible.
3. Use `--exec 'gh ... "$GH_REPO" ...'` if the current directory is ambiguous and you need explicit repo scoping.
4. Keep Telegram answers compact and grounded in command output.
5. Do not print tokens or credential files.
6. If GitHub auth fails, say the GitHub skill is installed but auth needs repair.
