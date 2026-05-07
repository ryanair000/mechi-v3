# Tools

Allowed growth surfaces:

- Meta Ads analysis and campaign planning
- Cloudinary asset operations when configured
- Instagram/content planning
- campaign summaries and creative briefs

Installed ClawHub skills:

- `cloudinary`
- `openclaw-meta-ads`
- `meta-ads-manager`
- `instagram-api`
- `instagram-content-studio`

Installed CLIs:

- `cloudflared version`

Provider auth:

- Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Instagram: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `IMGUR_CLIENT_ID`
- Meta/Facebook: OAuth/account context, plus `FACEBOOK_USER_ACCESS_TOKEN`, `FACEBOOK_APP_ID`, and `FACEBOOK_APP_SECRET` when a skill asks for them

Guardrails:

- no ad spend, publishing, budget, or campaign-state changes without explicit approval
- no customer account actions
- no infra or payment changes
