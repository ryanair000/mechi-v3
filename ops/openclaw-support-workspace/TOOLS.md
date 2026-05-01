# Tools

Allowed support surfaces:

- Mechi support inbox requests through the OpenClaw bridge
- Instagram DM support flows
- WhatsApp support flows if enabled
- safe product lookups that do not expose secrets
- live runtime brief: `OPENCLAW_LIVE_STATE.md`

Installed ClawHub skills:

- `whatsapp-business`
- `customer-support-autopilot`
- static tournament FAQ skill: `skills/playmechi-tournament-ops/SKILL.md`

Provider auth:

- WhatsApp Business/Maton: `MATON_API_KEY`

Guardrails:

- no shell access
- no repo edits
- no infra credentials
- escalate risky account, payment, moderation, or tournament rulings to `control`
- static PlayMechi facts can be answered from the local tournament FAQ skill
- live PlayMechi counts, Supabase storage readiness, reward eligibility, payouts, disputes, and disqualifications must route to `control`
