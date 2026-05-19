---
name: playmechi-tournament-ops
description: "Use for PlayMechi Weekend Cup questions, Mechi.club Online Gaming Tournament questions, WhatsApp/Telegram replies, registration guidance, rules, schedule, prizes, stream details, and admin runbook context."
metadata:
  owner: mechi
  version: "0.1.0"
---

# PlayMechi Tournament Ops

Use this skill whenever a player, operator, admin, Telegram group, or WhatsApp group asks about PlayMechi Weekend Cup Season 1, the older Mechi.club Online Gaming Tournament, PlayMechi tournament registration, PUBG Mobile, CODM, eFootball, prizes, schedule, rules, player slots, stream, payments, or reward eligibility.

## Immediate WhatsApp Replies

If a player says "How can I register?", "registration link", "I want to register", "register me", "how do I join", "join tournament", "sign up", "enter tournament", "want to register for tournament", or a typo like "oturnamnet", assume they mean the current Weekend Cup unless they clearly name the older 8-10 May PlayMechi event. Answer directly:

```text
Register for PlayMechi Weekend Cup Season 1 here:
https://mechi.club/weekendcup

Pick your game, confirm your player details, then pay with Paystack to lock your slot.

Season 1 runs 29-31 May 2026. PUBG, CODM, and eFootball are fixed; players are voting for the mystery game.
```

Do not ask which tournament before giving this answer unless the message clearly names a different event.

If the sender clearly asks about the older PlayMechi Launch / 8-10 May event, use:

```text
PlayMechi Launch registration is closed.

Current/open events are here:
https://mechi.club/weekendcup
https://mechi.club/tournaments
```

## Current Featured Event: Weekend Cup

- Tournament: PlayMechi Weekend Cup Season 1
- Public vote/preview page: `/`
- Registration path: `/weekendcup`
- Legacy Weekend Cup registration alias: `/weekendcup/register`
- Dates: Friday 29 May 2026 to Sunday 31 May 2026
- Prize pool: up to KSh 7,500
- Fixed games: PUBG Mobile, CODM, and eFootball
- Mystery game: selected by player vote
- Registration payment: Paystack
- Players who registered for the older PlayMechi tournament can reuse synced details where available

Weekend Cup entry fees:

- Early Bird: CODM KSh 50, PUBG KSh 50, Mystery Game KSh 50, eFootball KSh 100
- Phase 2: CODM KSh 75, PUBG KSh 75, Mystery Game KSh 75, eFootball KSh 125
- Final Rush: CODM KSh 100, PUBG KSh 100, Mystery Game KSh 100, eFootball KSh 150

Do not say a player is paid, confirmed, eligible, disqualified, or awarded unless live admin/payment data verifies it.

## Older PlayMechi Public Paths

- Main public homepage on Mechi: `/`
- Public tournament path: `/playmechi`
- Tournament registration path: closed; do not send `/playmechi/register` for new registrations
- Legacy tournament path still supported: `/online-gaming-tournament`
- Admin control page: `/admin/online-tournament`
- Public registration API: `/api/events/mechi-online-gaming-tournament/register`
- Admin registration API: `/api/admin/online-tournament-registrations`
- Supabase table: `public.online_tournament_registrations`
- Migration: `supabase/migrations/20260501080000_online_tournament_registrations.sql`

## Live Truth Path

For current player counts, recent signups, or whether the new tournament storage is ready, use the Supabase live ops skill:

```bash
npm run ops:registrations -- --json
```

Read the `onlineTournament` object in the output:

- `onlineTournament.storageReady`: whether `online_tournament_registrations` exists in live Supabase
- `onlineTournament.slots`: total event registration capacity, expected `600`
- `onlineTournament.checkInCap`: total match-day check-in capacity, expected `216`
- `onlineTournament.registered`: total event registrations
- `onlineTournament.spotsLeft`: remaining event slots
- `onlineTournament.games[]`: per-game registration caps, check-in caps, registered, verified, pending, checked-in, and spots left

If `storageReady` is `false`, say the live tournament registration table is not ready yet and that the migration must be applied before player slot locking can work. Do not claim live tournament registration counts from memory.

For open or active platform tournaments unrelated to this campaign, use:

```bash
npm run ops:tournaments -- --json
```

## Older PlayMechi Fixed Event Facts

- Tournament name: Mechi.club Online Gaming Tournament
- Organizer: Mechi.club
- Registration: free
- Tournament type: fully online
- Total registration cap: 600 players
- Total match-day check-in cap: 216 players
- Cash prize pool: KSh 6,000
- Stream channel: PlayMechi on Instagram, TikTok, and YouTube
- Streamer: Kabaka Mwangi
- Streamer fee: KSh 500 per day, 3 days, total KSh 1,500
- Total estimated cash needed: KSh 7,500
- Purpose: promote Mechi.club, grow PlayMechi, increase Instagram, TikTok, and YouTube engagement, and run a clean online gaming competition

## Schedule

- PUBG Mobile: Friday 8 May 2026 at 8:00 PM EAT
- Call of Duty Mobile: Saturday 9 May 2026 at 8:00 PM EAT
- eFootball: Sunday 10 May 2026 at 8:00 PM EAT

All matches start at 8:00 PM EAT.

## Games, Slots, And Formats

- PUBG Mobile: 200 registrations, 100 match-day check-ins, individual Battle Royale tournament room, 3 matches, 1 kill = 1 point, no placement points
- Call of Duty Mobile: 200 registrations, 100 match-day check-ins, individual Battle Royale tournament room, 3 matches, 1 kill = 3 points, placement #1 20, #2 15, #3 10, #4 5, #5-25 3
- eFootball: 200 registrations, 16 match-day check-ins, 1v1 online friendly knockout, Round of 16 to final, one leg per fixture

## Prizes

- PUBG Mobile:
  - 1st place: KSh 1,500
  - 2nd place: KSh 1,000
  - 3rd place: 60 UC
- Call of Duty Mobile:
  - 1st place: KSh 1,200
  - 2nd place: KSh 800
  - 3rd place: 80 CP
- eFootball:
  - 1st place: KSh 1,000
  - 2nd place: KSh 500
  - 3rd place: 315 Coins

Reference reward values:

- 80 CP: approximately KSh 160
- 60 UC: approximately KSh 120
- 137 Coins: approximately KSh 150
- eFootball confirmed 3rd place reward is 315 Coins; 137 Coins is only a reference value

## Registration Requirements

Players must provide:

- full name
- phone or WhatsApp number
- email address
- game they are registering for
- in-game username or gamer tag
- confirmation that they are available at 8:00 PM on match day
- confirmation that they agree to tournament rules
- confirmation that they followed PlayMechi on Instagram
- confirmation that they subscribed to PlayMechi on YouTube
- Instagram username used to follow PlayMechi
- YouTube account or channel name used to subscribe to PlayMechi

PlayMechi Launch registration is closed. Players looking for new events should use `/weekendcup` or `/tournaments`.

## Reward Eligibility Rule

Official wording:

To qualify for tournament rewards, all registered players must follow PlayMechi on Instagram and subscribe to PlayMechi on YouTube before their match day. Players who fail to meet this requirement will be allowed to participate, but they will not be eligible to receive prizes or rewards.

Do not say a player is reward-eligible until an admin has verified them in `/admin/online-tournament`.

## General Rules

- Registration is free.
- Tournament is fully online.
- All matches start at 8:00 PM EAT.
- Players must use the same username submitted during registration.
- Players must join the room or match on time.
- Late players may be disqualified.
- Only registered players are allowed to participate.
- Cheating, hacking, teaming, scripts, emulator abuse, or unfair tools are not allowed.
- Abusive language, insults, threats, or toxic behavior are not allowed.
- Results are verified using screenshots or admin records.
- Admin decisions are final.
- Players must follow PlayMechi on Instagram and subscribe on YouTube before match day to qualify for rewards.
- Players who do not meet social media requirements are not eligible for prizes or rewards.
- Any attempt to use a different account from the registered account may lead to disqualification.
- Disputes must be reported immediately with proof.
- The organizer can update rules where necessary to protect fair play.

## Game-Specific Notes

PUBG Mobile:

- room ID and password are shared before match time
- players enter using their registered PUBG username
- final rank is total kills after 3 matches
- disconnects keep the result recorded by the game

Call of Duty Mobile:

- room ID and password are shared before match time
- players enter using their registered CODM username
- final rank is total kills after 3 matches
- emulator abuse is explicitly banned
- disconnects keep the result recorded by the game

eFootball:

- 16-player knockout from Round of 16
- winner advances, loser is eliminated
- screenshot required after every match
- draws go to extra time and penalties if available
- if extra time or penalties are not available, replay with Golden Goal
- intentional disconnects may award the opponent the win

## PUBG/CODM Tie-Breakers

If players have equal total kills after 3 matches:

1. Highest kills in a single match
2. Best placement in the final match
3. Earliest registration
4. Admin decision if still tied

## Communication Channels

Recommended WhatsApp groups:

- Mechi PUBG Mobile Tournament Group: `https://chat.whatsapp.com/HDZwDyft00kIVHb6vYVbJv`
- Mechi CODM Tournament Group: `https://chat.whatsapp.com/JmizQcphVYR2LiRYcrHEaC`
- Mechi eFootball Tournament Group: `https://chat.whatsapp.com/Cf9R0k2dPeP683wpNnib1N`
- PlayMechi Community Group: `https://chat.whatsapp.com/GRquLpTxzQ35er85N33Ec7?mode=gi_t`
- Mechi Tournament Admin Group

Use groups for announcements, rules updates, room ID/password sharing, fixtures, result submission, player support, disputes, and winner announcements.

## Result Submission Format

PUBG/CODM:

```text
Game:
Match:
Player Name:
In-game Username:
Kills:
Screenshot:
```

eFootball:

```text
Game: eFootball
Round:
Player 1:
Player 2:
Winner:
Score:
Screenshot:
```

## Admin Roles

- Main Organizer: overall event control
- Registration Admin: confirms player registration and social qualification
- PUBG Admin: manages PUBG room, scoring, and results
- CODM Admin: manages CODM room, scoring, and results
- eFootball Admin: manages fixtures, match results, and disputes
- Stream Manager: coordinates with Kabaka Mwangi and PlayMechi stream
- Social Media Admin: posts updates, reminders, winners, and highlights
- Dispute Admin: handles complaints and final decisions

## Team

- Kabaka Mwangi: Streamer
- Ephrem Gichuhi: Manager
- Ryan Alfred: Organizer

## Player Roadmap

1. Open `mechi.club` or `/playmechi`.
2. Choose `Register Now`.
3. Create or sign into a Mechi account.
4. Pick PUBG Mobile, CODM, or eFootball.
5. Confirm the exact in-game username.
6. Confirm 8:00 PM availability and accept rules.
7. Follow PlayMechi on Instagram and subscribe to PlayMechi on YouTube.
8. Submit Instagram username and YouTube name for admin verification.
9. Join the correct WhatsApp group when admins share it.
10. Check match-day reminders, room IDs, passwords, fixtures, or opponent details.
11. Play at 8:00 PM EAT.
12. Submit screenshots/results immediately.
13. Wait for admin verification, provisional results, dispute window, final results, and reward confirmation.

## WhatsApp Response Guardrails

- Keep player replies short and clear.
- Give static schedule, prizes, rules, and registration path confidently from this skill.
- For current slots, storage status, recent signups, or live player counts, run `npm run ops:registrations -- --json` through the `supabase-live-ops` skill if the channel is operator/admin/control.
- Customer-safe support/community agents without Supabase access should answer static facts and route live-count or admin decisions to `control`.
- Do not promise that a player has won, qualified for rewards, been paid, been disqualified, or been verified unless the live admin data confirms it.
- Treat payout, disqualification, reward eligibility, account actions, and public announcements as high-risk.
