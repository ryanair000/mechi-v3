---
name: mechi-social-exec
description: Publish Mechi social posts across Instagram, Facebook, X, and Discord with platform-specific formatting and Mechi-safe caption rules.
allowed-tools:
  - Bash(node scripts/*)
  - message
compatibility: Requires node (v22+). Instagram publishing relies on the existing instagram-api or instagram-content-studio skills. X publishing relies on xurl when installed and authenticated. Discord can use either the message tool or a webhook URL.
metadata:
  version: "1.0"
---

# Mechi Social Exec

Use this skill when `growth` or `socio` is asked to draft or publish Mechi social content.

Before drafting or publishing, read `MECHI_SOCIAL_PLAYBOOK.md` from the workspace root.

## Default decision rules

- If the Boss provides caption text, preserve the intent and only clean it lightly.
- If the Boss says to save a caption format, treat the approved structure in `MECHI_SOCIAL_PLAYBOOK.md` as the live default until the Boss replaces it.
- If the Boss drops a photo or video in the private `OPS -> SMM` Telegram room without naming channels, treat it as an Instagram publishing request.
- If the Boss says `socio post chezahub`, publish to both Instagram and Facebook for the `ChezaHub` brand pair.
- If the Boss says `socio post playmechi`, publish to both Instagram and Facebook for the `PlayMechi` brand pair.
- If the Boss says `socio instagram <brand>`, publish only to Instagram for that brand.
- If the Boss says `socio facebook <brand>`, publish only to Facebook for that brand.
- If the Boss says `socio x <brand>`, publish only to X for that brand.
- If the Boss says `socio instagram/facebook <brand>`, publish to Instagram and Facebook for that brand.
- If the Boss says `socio all <brand>`, publish to Instagram, Facebook, and X for that brand.
- If the Boss says `socio ping` or `socio test`, do not publish anything. Reply with a short live-readiness check that confirms the active brand commands and whether Instagram, Facebook, X, and Discord are ready or missing auth.
- If the Boss says `socio help`, do not publish anything. Reply with the supported command list and a one-line explanation for each target pattern.
- If the Boss names extra targets such as Facebook, X, Discord, or `post all`, publish only to those named channels in addition to Instagram.
- Never invent event facts. If the media does not make the topic obvious, ask one short clarification instead of guessing.
- If the brand is not explicit and the asset could fit either `ChezaHub` or `PlayMechi`, ask one short clarification before posting.

## Channel actions

### Instagram

For explicit brand-pair commands, prefer the local helpers in this skill so the publish target is deterministic:

```bash
node scripts/publish-meta-photo.mjs --brand chezahub --caption-file ./caption.txt ./image.jpg
node scripts/publish-meta-photo.mjs --brand playmechi --caption-file ./caption.txt ./image.jpg
node scripts/publish-meta-video.mjs --brand playmechi --caption-file ./caption.txt ./clip.mp4
```

For Instagram-only work, use either the local helpers:

```bash
node scripts/publish-instagram-photo.mjs --brand chezahub --caption-file ./caption.txt ./image.jpg
node scripts/publish-instagram-video.mjs --brand playmechi --caption-file ./caption.txt ./clip.mp4
```

For exact channel combinations from Telegram command text, use:

```bash
node scripts/publish-social-photo.mjs --brand playmechi --channels instagram ./image.jpg
node scripts/publish-social-photo.mjs --brand playmechi --channels facebook ./image.jpg
node scripts/publish-social-photo.mjs --brand playmechi --channels x ./image.jpg
node scripts/publish-social-photo.mjs --brand playmechi --channels instagram/facebook ./image.jpg
node scripts/publish-social-photo.mjs --brand playmechi --channels all ./image.jpg
```

or the installed Instagram skills already in the growth workspace:

- `instagram-content-studio`
- `instagram-api`

Use those skills for:

- feed photos
- carousels
- reels
- comments or replies when asked

Always return the final permalink or returned media id.

For deal posters, subscription offers, and store promos:

- use the approved promo-offer format from `MECHI_SOCIAL_PLAYBOOK.md`
- if the media is the current Fortnite Crew offer, the saved approved example in the playbook can be used as-is unless the Boss overrides it
- use `ChezaHub` when the CTA is about ordering passes, bundles, subscriptions, or store purchases at `chezahub.co.ke`
- use `PlayMechi` when the CTA is about tournaments, clips, streams, registration, or community hype around `mechi.club/playmechi`

### Facebook

Use the local helper scripts in this skill:

```bash
node scripts/publish-facebook-photo.mjs --brand chezahub --caption-file ./caption.txt ./image.jpg
node scripts/publish-facebook-video.mjs --brand playmechi --caption-file ./caption.txt ./clip.mp4
```

Supported inputs:

- local file path
- remote `http://` or `https://` media URL

Required env:

- generic default:
  - `FACEBOOK_PAGE_ID`
  - `FACEBOOK_PAGE_ACCESS_TOKEN`
- brand-specific pair support:
  - `CHEZAHUB_FACEBOOK_PAGE_ID`
  - `CHEZAHUB_FACEBOOK_PAGE_ACCESS_TOKEN`
  - `PLAYMECHI_FACEBOOK_PAGE_ID`
  - `PLAYMECHI_FACEBOOK_PAGE_ACCESS_TOKEN`

Optional env:

- `FACEBOOK_GRAPH_API_VERSION`
- `SOCIO_S3_STAGING_BUCKET`
- `SOCIO_S3_STAGING_PREFIX`

### X

Check readiness first:

```bash
node scripts/check-social-readiness.mjs --json
xurl auth status
```

Primary publish path now uses the direct OAuth1 helpers in this skill with:

- `X_API_KEY`
- `X_API_SECRET`
- `X_ACCESS_TOKEN`
- `X_ACCESS_TOKEN_SECRET`

Publish with:

```bash
node scripts/publish-x-photo.mjs --brand playmechi --caption-file ./caption.txt ./image.jpg
node scripts/publish-x-video.mjs --brand playmechi --caption-file ./caption.txt ./clip.mp4
```

Rules:

- keep copy tight
- keep hashtags minimal
- stay inside X length constraints
- X requires the real API key/secret pair plus a user access token pair; account login alone is not enough for the API path
- `xurl` is still useful for diagnostics, but live publish no longer depends on its auth state
- optional helpers:
  - `PLAYMECHI_X_USERNAME`
  - `CHEZAHUB_X_USERNAME`
  - `X_AUTH_TYPE`
  - `XURL_APP_NAME`

### Discord

If `DISCORD_WEBHOOK_URL` is configured, use:

```bash
node scripts/publish-discord-webhook.mjs --message-file ./caption.txt ./image.jpg
```

If the webhook is not configured but native Discord channel support is configured, use the `message` tool with:

- `channel: "discord"`
- `action: "send"`
- `to: "channel:<DISCORD_POST_CHANNEL_ID>"`

Keep Discord copy short and community-first.

## Output contract

After each publish action:

- say which channels were posted
- include ids or permalinks when available
- say clearly if any channel was skipped because credentials or auth were missing
