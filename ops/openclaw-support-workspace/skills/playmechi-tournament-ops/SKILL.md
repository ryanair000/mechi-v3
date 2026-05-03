---
name: playmechi-tournament-ops
description: "Customer-safe static FAQ for the Mechi.club Online Gaming Tournament on WhatsApp/support surfaces."
metadata:
  owner: mechi
  workspace: support
---

# PlayMechi Tournament Support FAQ

Use this for public player questions about the Mechi.club Online Gaming Tournament. This support copy is for fixed facts only. Live counts, reward eligibility, disqualifications, payouts, and admin decisions must route to `control`.

## Immediate WhatsApp Replies

If a player says "I want to register", "register me", "join tournament", "sign up", "enter tournament", "want to register for tournament", or a typo like "oturnamnet", assume they mean PlayMechi and answer directly:

```text
Yes. Register for the PlayMechi tournament here:
https://mechi.club/playmechi/register

Pick PUBG Mobile, CODM, or eFootball, enter your exact in-game username, then submit your Instagram and YouTube names for reward verification.

Matches start at 8:00 PM EAT from 8-10 May 2026.
```

If they ask "what tournament", "details", or "which games":

```text
The PlayMechi tournament is free online for PUBG Mobile, CODM, and eFootball.

PUBG: Fri 8 May, 8:00 PM
CODM: Sat 9 May, 8:00 PM
eFootball: Sun 10 May, 8:00 PM

Register: https://mechi.club/playmechi/register
```

Do not ask which tournament before giving this answer unless the message clearly names a different event.

## Public Links

- Homepage: `mechi.club`
- Tournament page: `mechi.club/playmechi`
- Registration: `mechi.club/playmechi/register`
- Stream: YouTube, PlayMechi

## Fixed Facts

- Tournament: Mechi.club Online Gaming Tournament
- Organizer: Mechi.club
- Registration: free
- Type: fully online
- Total slots: 216 players
- Cash prize pool: KSh 6,000
- Streamer: Kabaka Mwangi
- Streamer fee: KSh 500 per day for 3 days

## Schedule

- PUBG Mobile: Friday 8 May 2026 at 8:00 PM EAT, 100 slots
- Call of Duty Mobile: Saturday 9 May 2026 at 8:00 PM EAT, 100 slots
- eFootball: Sunday 10 May 2026 at 8:00 PM EAT, 16 slots

## Prizes

- PUBG Mobile: 1st KSh 1,500, 2nd KSh 1,000, 3rd 60 UC
- CODM: 1st KSh 1,200, 2nd KSh 800, 3rd 80 CP
- eFootball: 1st KSh 1,000, 2nd KSh 500, 3rd 315 Coins

## Player Registration Requirements

Players must create or sign into Mechi, pick a game, provide their exact in-game username, phone/WhatsApp, email, Instagram username, YouTube name, confirm 8:00 PM availability, and agree to tournament rules.

## Reward Eligibility

Players must follow PlayMechi on Instagram and subscribe to PlayMechi on YouTube before match day to qualify for rewards. Players who do not complete both can participate, but they are not eligible for prizes or rewards.

Do not confirm a player is eligible, paid, disqualified, or a winner from support chat. Escalate those to `control`.

## Core Rules

- Same username as registration.
- Join rooms/matches on time.
- Late players may be disqualified.
- Cheating, hacking, teaming, scripts, emulator abuse, and unfair tools are not allowed.
- Toxic language, insults, threats, and abuse are not allowed.
- Results are verified by screenshots or admin records.
- Admin decisions are final.

## Results

PUBG/CODM result format:

```text
Game:
Match:
Player Name:
In-game Username:
Kills:
Screenshot:
```

eFootball result format:

```text
Game: eFootball
Round:
Player 1:
Player 2:
Winner:
Score:
Screenshot:
```

## Escalate To Control

Escalate:

- live slot counts if the read-only `supabase-live-ops` helper is unavailable
- registration table/storage errors or failed live checks
- reward eligibility decisions
- payment/payout questions
- disqualifications
- disputes
- admin group/operator requests
- requests to change tournament rules or results
