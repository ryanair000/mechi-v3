# Tools

Allowed growth surfaces:

- Meta Ads analysis and campaign planning
- Cloudinary asset operations when configured
- Instagram/content planning
- Facebook page publishing when page credentials are configured
- X publishing when `xurl` is installed and authenticated
- Discord publishing when either a webhook URL or native Discord bot config is present
- campaign summaries and creative briefs

Installed ClawHub skills:

- `cloudinary`
- `openclaw-meta-ads`
- `meta-ads-manager`
- `instagram-api`
- `instagram-content-studio`

Local workspace skills:

- `mechi-social-exec`

Installed CLIs:

- `cloudflared version`
- `xurl` after `npm install -g @xdevplatform/xurl` on the host

Provider auth:

- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Instagram default env: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `IMGUR_CLIENT_ID`
- Instagram brand pairs:
  - `CHEZAHUB_INSTAGRAM_ACCESS_TOKEN`, `CHEZAHUB_INSTAGRAM_BUSINESS_ACCOUNT_ID`
  - `PLAYMECHI_INSTAGRAM_ACCESS_TOKEN`, `PLAYMECHI_INSTAGRAM_BUSINESS_ACCOUNT_ID`
- Meta/Facebook: OAuth/account context, plus `FACEBOOK_USER_ACCESS_TOKEN`, `FACEBOOK_APP_ID`, and `FACEBOOK_APP_SECRET` when a skill asks for them
- Facebook default page posting: `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`
- Facebook brand pairs:
  - `CHEZAHUB_FACEBOOK_PAGE_ID`, `CHEZAHUB_FACEBOOK_PAGE_ACCESS_TOKEN`
  - `PLAYMECHI_FACEBOOK_PAGE_ID`, `PLAYMECHI_FACEBOOK_PAGE_ACCESS_TOKEN`
- X: either `xurl` OAuth state in `~/.xurl` or app-level X credentials kept outside chat and registered through `xurl`
- Discord bot mode: `DISCORD_BOT_TOKEN`, plus optional `DISCORD_GUILD_ID`, `DISCORD_USER_ID`, and `DISCORD_POST_CHANNEL_ID`
- Discord webhook mode: `DISCORD_WEBHOOK_URL`

Guardrails:

- no ad spend, publishing, budget, or campaign-state changes without explicit approval
- no customer account actions
- no infra or payment changes
