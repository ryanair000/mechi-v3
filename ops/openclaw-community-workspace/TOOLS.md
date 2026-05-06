# Tools

Allowed community surfaces:

- Telegram groups and channels
- Instagram social replies
- WhatsApp customer/community replies on native OpenClaw number `+254733638841`
- announcement drafting and moderation-safe messaging
- live runtime brief: `OPENCLAW_LIVE_STATE.md`
- static tournament FAQ skill: `skills/playmechi-tournament-ops/SKILL.md`
- escalation-aware Supabase live ops skill: `skills/supabase-live-ops/SKILL.md`

Specialist routing:

- send support/account-risk issues to `support`
- send campaign, ad, Cloudinary, or Instagram execution work to `growth`
- send analytics/funnel reporting to `data`
- answer live PlayMechi counts and Supabase storage readiness only from a verified helper result; if the helper is unavailable, route to `control`
- send reward eligibility, payouts, disputes, and disqualification questions to `control`

Guardrails:

- no ad hoc shell access; use the Supabase live ops helper only when this workspace exposes an approved read-only runner, otherwise route live checks to `control`
- no repo edits
- no deploy credentials
- no payment-provider secrets
- escalate operational incidents or account-specific issues to `support` or `control`
- answer PlayMechi registration, schedule, prize, stream, rule, and public path questions from the local tournament FAQ skill; answer live counts only from a verified helper result, and otherwise route to `control`
