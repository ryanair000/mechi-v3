# PlayMechi Online Gaming Tournament

## Source Of Truth

- Static event facts: repo skill `skills/playmechi-tournament-ops/SKILL.md`
- Live counts/storage readiness: `npm run ops:registrations -- --json`, read `onlineTournament`
- Public page: `mechi.club` and `mechi.club/playmechi`
- Registration: `mechi.club/playmechi/register`
- Admin page: `/admin/online-tournament`
- Supabase table: `public.online_tournament_registrations`

If `onlineTournament.storageReady` is false, live tournament slot locking is not ready. Apply the Supabase migration before promoting registration publicly.

## Fixed Facts

- Tournament: Mechi.club Online Gaming Tournament
- Organizer: Mechi.club
- Registration: free
- Type: fully online
- Total slots: 216 players
- Cash prize pool: KSh 6,000
- Total estimated cash needed: KSh 7,500
- Stream: PlayMechi on YouTube
- Streamer: Kabaka Mwangi
- Streamer fee: KSh 500 per day for 3 days

## Schedule

- PUBG Mobile: Friday 8 May 2026, 8:00 PM EAT, 100 slots
- Call of Duty Mobile: Saturday 9 May 2026, 8:00 PM EAT, 100 slots
- eFootball: Sunday 10 May 2026, 8:00 PM EAT, 16 slots

## Prizes

- PUBG Mobile: KSh 1,500, KSh 1,000, 60 UC
- CODM: KSh 1,200, KSh 800, 80 CP
- eFootball: KSh 1,000, KSh 500, 315 Coins

## Reward Eligibility

Players must follow PlayMechi on Instagram and subscribe to PlayMechi on YouTube before match day to qualify for rewards. Players who do not complete both can participate, but they are not eligible for prizes or rewards.

Admin verification in `/admin/online-tournament` is the source of truth.

## WhatsApp Routing

- Operator/admin WhatsApp groups route to `control`.
- Customer WhatsApp support can answer fixed FAQ from the tournament skill.
- Live counts, payouts, eligibility, disqualifications, and disputes route to `control`.

## Team

- Kabaka Mwangi: Streamer
- Ephrem Gichuhi: Manager
- Ryan Alfred: Organizer
