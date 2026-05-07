# OpenClaw Live State

This workspace is the growth and media operations agent for Mechi.

Installed ClawHub skills for this workspace:

- `cloudinary`
- `openclaw-meta-ads`
- `meta-ads-manager`
- `instagram-api`
- `instagram-content-studio`

The direct `meta-ads` and `instagram` slugs were not used because their ClawHub archives lacked a valid top-level `SKILL.md`. Use the working alternatives above.

Host CLIs available:

- `cloudflared version`

Credential gates:

- Cloudinary requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Instagram requires `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, and `IMGUR_CLIENT_ID` when media helpers need it.
- Meta Ads uses account/OAuth context and must ask the Boss before write, spend, budget, or campaign-state changes.

Use this workspace for campaign analysis, creative planning, media operations, and growth execution. Do not make spend, publishing, or campaign-state changes without explicit Boss approval.
