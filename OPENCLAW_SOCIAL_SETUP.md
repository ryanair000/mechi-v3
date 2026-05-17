# OpenClaw Social Setup

This runbook covers the Mechi social stack for the `growth` and `socio` OpenClaw lanes.

## What is already wired

- `socio` routes from the Boss private Telegram `OPS -> SMM` room on EC2.
- Instagram posting is already backed by the `instagram-api` and `instagram-content-studio` skills.
- The growth workspace now includes:
  - `MECHI_SOCIAL_PLAYBOOK.md`
  - local skill `mechi-social-exec`
  - Facebook helper scripts
  - Discord webhook helper script
  - cross-channel readiness checker

## Host sync command

Run this on the EC2 host from the Mechi repo:

```bash
cd /home/ubuntu/mechi-v3
bash scripts/openclaw-configure-socio-telegram.sh
bash scripts/openclaw-prune-smm-only.sh
```

That command now:

- syncs `ops/openclaw-growth-workspace` into `~/.openclaw/workspace-growth`
- keeps the `socio` Telegram routing in place
- syncs Instagram, Facebook, TikTok, X, and Discord env keys into both `~/.openclaw/.env` and `~/.openclaw/workspace-growth/.env`
- syncs brand-pair Meta env keys for `ChezaHub` and `PlayMechi` when they are provided
- removes stale duplicate managed social keys before rewriting them
- prefers caller-supplied env values over stale saved host values when both exist
- installs `xurl` when missing unless `SOCIO_INSTALL_XURL=false`
- enables native Discord bot config when `DISCORD_BOT_TOKEN` is present
- prunes the EC2 runtime back to Telegram SMM only so bridge, Nginx, WhatsApp, stale cron jobs, and archived non-SMM agent state stay out of the hot path

## Credential checklist

Prefer tokens, ids, and webhook URLs over raw passwords.

### Instagram

- `INSTAGRAM_ACCESS_TOKEN`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `IMGUR_CLIENT_ID`

Optional brand pairs:

- `CHEZAHUB_INSTAGRAM_ACCESS_TOKEN`
- `CHEZAHUB_INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `PLAYMECHI_INSTAGRAM_ACCESS_TOKEN`
- `PLAYMECHI_INSTAGRAM_BUSINESS_ACCOUNT_ID`

### Facebook page posting

- `FACEBOOK_PAGE_ID`
- `FACEBOOK_PAGE_ACCESS_TOKEN`

Optional brand pairs:

- `CHEZAHUB_FACEBOOK_PAGE_ID`
- `CHEZAHUB_FACEBOOK_PAGE_ACCESS_TOKEN`
- `PLAYMECHI_FACEBOOK_PAGE_ID`
- `PLAYMECHI_FACEBOOK_PAGE_ACCESS_TOKEN`

Optional:

- `FACEBOOK_USER_ACCESS_TOKEN`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`

### X

Choose one path:

1. `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`
2. `xurl` auth on the host for diagnostics
3. `X_OAUTH2_ACCESS_TOKEN`

For the live PlayMechi bind, the repo helper is:

```bash
bash scripts/openclaw-bind-playmechi-x.sh <request_token> <request_token_secret> <verifier>
```

### TikTok

The local helper supports official TikTok Content Posting API video publishing through `FILE_UPLOAD`.

- `TIKTOK_ACCESS_TOKEN`
- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- optional brand-scoped token: `PLAYMECHI_TIKTOK_ACCESS_TOKEN`
- optional brand-scoped app keys: `PLAYMECHI_TIKTOK_CLIENT_KEY`, `PLAYMECHI_TIKTOK_CLIENT_SECRET`
- optional privacy default: `TIKTOK_PRIVACY_LEVEL` or `PLAYMECHI_TIKTOK_PRIVACY_LEVEL`

Recommended starting privacy is `SELF_ONLY` until the TikTok developer app has passed the Content Posting API audit and public posting is confirmed. TikTok direct posting requires the account token to include `video.publish`.

For phone approval/manual posting, use the inbox upload lane. TikTok requires the account token to include `video.upload`, then the creator must click the TikTok inbox notification and finish the post in the TikTok app:

```bash
node scripts/publish-social-video.mjs --brand playmechi --channels tiktok-draft --caption "Caption to copy into TikTok" ./video.mp4
```

To generate the TikTok user token from the helper:

```bash
cd /home/ubuntu/.openclaw/workspace-growth/skills/mechi-social-exec
node scripts/tiktok-oauth-flow.mjs authorize \
  --client-key "$PLAYMECHI_TIKTOK_CLIENT_KEY" \
  --redirect-uri "https://mechi.club/api/auth/tiktok/callback" \
  --scope "video.upload,video.publish"
```

Open the returned `authorizeUrl`, approve with the PlayMechi TikTok account, then exchange the returned `code`:

```bash
node scripts/tiktok-oauth-flow.mjs exchange \
  --client-key "$PLAYMECHI_TIKTOK_CLIENT_KEY" \
  --client-secret "$PLAYMECHI_TIKTOK_CLIENT_SECRET" \
  --redirect-uri "https://mechi.club/api/auth/tiktok/callback" \
  --code "RETURNED_CODE" \
  --code-verifier "RETURNED_CODE_VERIFIER"
```

Save `access_token` as `PLAYMECHI_TIKTOK_ACCESS_TOKEN`.

Useful optional toggles:

- `TIKTOK_DISABLE_DUET=true`
- `TIKTOK_DISABLE_STITCH=true`
- `TIKTOK_DISABLE_COMMENT=true`
- `TIKTOK_BRAND_CONTENT_TOGGLE=true`
- `TIKTOK_BRAND_ORGANIC_TOGGLE=true`
- `TIKTOK_IS_AIGC=true`

### Discord

Choose one path:

1. Native bot path:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_GUILD_ID`
   - `DISCORD_USER_ID`
   - `DISCORD_POST_CHANNEL_ID`
2. Webhook path:
   - `DISCORD_WEBHOOK_URL`

## Verification commands

From the growth workspace on EC2:

```bash
cd /home/ubuntu/.openclaw/workspace-growth/skills/mechi-social-exec
node scripts/check-social-readiness.mjs
```

For X auth:

```bash
xurl auth status
```

For TikTok, the readiness checker reports whether the access token is present. A direct live post test still requires an approved TikTok app token and a safe test video:

```bash
node scripts/publish-social-video.mjs --brand playmechi --channels tiktok --caption "Test post" ./test-video.mp4
```

For Discord bot config:

```bash
/home/ubuntu/.npm-global/bin/openclaw config validate --json
```
