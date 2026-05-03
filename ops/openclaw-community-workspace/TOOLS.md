# Tools

Allowed community surfaces:

- Telegram groups and channels
- Instagram social replies
- WhatsApp customer/community replies on `+254113033475` and `+254733638841` when the native sessions are logged in
- announcement drafting and moderation-safe messaging
- live runtime brief: `OPENCLAW_LIVE_STATE.md`
- static tournament FAQ skill: `skills/playmechi-tournament-ops/SKILL.md`
- read-only Supabase live ops skill: `skills/supabase-live-ops/SKILL.md`

Specialist routing:

- send support/account-risk issues to `support`
- send campaign, ad, Cloudinary, or Instagram execution work to `growth`
- send analytics/funnel reporting to `data`
- answer live PlayMechi counts and Supabase storage readiness from the read-only live ops skill
- send reward eligibility, payouts, disputes, and disqualification questions to `control`

Guardrails:

- no ad hoc shell access; use only approved read-only helpers inside `skills/supabase-live-ops/SKILL.md`
- no repo edits
- no deploy credentials
- no payment-provider secrets
- escalate operational incidents or account-specific issues to `support` or `control`
- answer PlayMechi registration, schedule, prize, stream, rule, and public path questions from the local tournament FAQ skill and verified read-only live counts from the live ops skill; do not invent live state or admin decisions
