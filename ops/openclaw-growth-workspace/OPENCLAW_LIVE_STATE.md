# OpenClaw Live State

This workspace is the live `socio` SMM workspace for the EC2 OpenClaw host and the only active OpenClaw workspace in the current SMM-only runtime.

Installed ClawHub skills for this workspace:

- `cloudinary`
- `openclaw-meta-ads`
- `meta-ads-manager`
- `instagram-api`
- `instagram-content-studio`

Local workspace skills:

- `mechi-social-exec`

The direct `meta-ads` and `instagram` slugs were not used because their ClawHub archives lacked a valid top-level `SKILL.md`. Use the working alternatives above.

Host CLIs available:

- `cloudflared version`

Credential gates:

- Cloudinary requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Instagram requires `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, and `IMGUR_CLIENT_ID` for the generic/default path.
- Brand-pair Instagram routing also supports:
  - `CHEZAHUB_INSTAGRAM_ACCESS_TOKEN`, `CHEZAHUB_INSTAGRAM_BUSINESS_ACCOUNT_ID`
  - `PLAYMECHI_INSTAGRAM_ACCESS_TOKEN`, `PLAYMECHI_INSTAGRAM_BUSINESS_ACCOUNT_ID`
- Facebook page publishing requires `FACEBOOK_PAGE_ID` and `FACEBOOK_PAGE_ACCESS_TOKEN` for the generic/default path.
- Brand-pair Facebook routing also supports:
  - `CHEZAHUB_FACEBOOK_PAGE_ID`, `CHEZAHUB_FACEBOOK_PAGE_ACCESS_TOKEN`
  - `PLAYMECHI_FACEBOOK_PAGE_ID`, `PLAYMECHI_FACEBOOK_PAGE_ACCESS_TOKEN`
- As of 2026-05-11 EAT, both live brand pairs are configured on EC2:
  - `ChezaHub` -> Facebook `ChezaHub`, Instagram `@chezahub`
  - `PlayMechi` -> Facebook `Mechi`, Instagram `@playmechi`
- X publishing requires the `xurl` CLI plus an authenticated X account state in `~/.xurl`.
- Discord publishing can use either `DISCORD_WEBHOOK_URL` or native Discord channel config with `DISCORD_BOT_TOKEN`.
- Meta Ads uses account/OAuth context and must ask the Boss before write, spend, budget, or campaign-state changes.

Use this workspace for campaign analysis, creative planning, media operations, and growth execution. Use `MECHI_SOCIAL_PLAYBOOK.md` plus the `mechi-social-exec` skill for Mechi-safe captioning and cross-channel publishing. Do not make spend, publishing, or campaign-state changes without explicit Boss approval.
