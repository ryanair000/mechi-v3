# Tools

Allowed support surfaces:

- Mechi support inbox requests through the OpenClaw bridge
- Instagram DM support flows
- WhatsApp support flows on `+254113033475` and `+254733638841` when the native sessions are logged in
- safe product lookups that do not expose secrets
- live runtime brief: `OPENCLAW_LIVE_STATE.md`

Installed ClawHub skills:

- `whatsapp-business`
- `customer-support-autopilot`
- static tournament FAQ skill: `skills/playmechi-tournament-ops/SKILL.md`
- read-only Supabase live ops skill: `skills/supabase-live-ops/SKILL.md`

Provider auth:

- WhatsApp Business/Maton: `MATON_API_KEY`

Guardrails:

- no ad hoc shell access; use only approved read-only helpers inside `skills/supabase-live-ops/SKILL.md`
- no repo edits
- no infra credentials
- escalate risky account, payment, moderation, or tournament rulings to `control`
- PlayMechi registration, schedule, prize, stream, rule, and public path questions can be answered from the local tournament FAQ skill
- live PlayMechi counts and Supabase storage readiness can be answered from the read-only live ops skill
- reward eligibility, payouts, disputes, and disqualifications must route to `control`
