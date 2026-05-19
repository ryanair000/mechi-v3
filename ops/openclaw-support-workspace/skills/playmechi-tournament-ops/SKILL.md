---
name: playmechi-tournament-ops
description: "Customer-safe static FAQ for PlayMechi tournaments on WhatsApp/support surfaces."
metadata:
  owner: mechi
  workspace: support
---

# PlayMechi Tournament Support FAQ

Use this for public player questions about PlayMechi tournaments. This support copy is for fixed facts only. Live counts, reward eligibility, disqualifications, payouts, payment confirmations, and admin decisions must route to `control`.

## Immediate WhatsApp Replies

If a player says "How can I register?", "registration link", "I want to register", "register me", "how do I join", "join tournament", "sign up", "enter tournament", "want to register for tournament", or a typo like "oturnamnet", assume they mean the current Weekend Cup unless they clearly name the older 8-10 May PlayMechi event. Answer directly:

```text
Register for PlayMechi Weekend Cup Season 1 here:
https://mechi.club/weekendcup

Pick your game, confirm your player details, then pay with Paystack to lock your slot.

Season 1 runs 29-31 May 2026. PUBG, CODM, and eFootball are fixed; players are voting for the mystery game.
```

If they ask "what tournament", "details", or "which games":

```text
PlayMechi Weekend Cup Season 1 runs 29-31 May 2026.

Fixed games:
PUBG Mobile: Fri 29 May
CODM: Sat 30 May
eFootball: Sun 31 May

Players are voting for the mystery game. Register: https://mechi.club/weekendcup
```

Do not ask which tournament before giving this answer unless the message clearly names a different event.

## Public Links

- Homepage and Weekend Cup vote page: `mechi.club`
- Weekend Cup registration: `mechi.club/weekendcup`
- Older PlayMechi page: `mechi.club/playmechi`
- Older PlayMechi registration: closed; do not send `mechi.club/playmechi/register` for new registrations
- PUBG Mobile WhatsApp group: `https://chat.whatsapp.com/HDZwDyft00kIVHb6vYVbJv`
- CODM WhatsApp group: `https://chat.whatsapp.com/JmizQcphVYR2LiRYcrHEaC`
- eFootball WhatsApp group: `https://chat.whatsapp.com/Cf9R0k2dPeP683wpNnib1N`
- PlayMechi Community WhatsApp group: `https://chat.whatsapp.com/GRquLpTxzQ35er85N33Ec7?mode=gi_t`
- Stream: YouTube, PlayMechi

## Weekend Cup Fixed Facts

- Tournament: PlayMechi Weekend Cup Season 1
- Dates: Friday 29 May 2026 to Sunday 31 May 2026
- Prize pool: up to KSh 7,500
- Stream: live on Mechi
- Fixed games: PUBG Mobile, CODM, eFootball
- Mystery game: selected by player vote
- Registration/payment: Paystack confirms the slot
- Players who registered for PlayMechi can reuse synced details where available

## Weekend Cup Entry Fees

- Early Bird: CODM KSh 50, PUBG KSh 50, Mystery Game KSh 50, eFootball KSh 100
- Phase 2: CODM KSh 75, PUBG KSh 75, Mystery Game KSh 75, eFootball KSh 125
- Final Rush: CODM KSh 100, PUBG KSh 100, Mystery Game KSh 100, eFootball KSh 150

Do not say a player is paid or confirmed unless live payment status is verified.

## Older PlayMechi Fixed Facts

- Tournament: Mechi.club Online Gaming Tournament
- Organizer: Mechi.club
- Registration: free
- Type: fully online
- Total slots: 216 players
- Cash prize pool: KSh 6,000
- Streamer: Kabaka Mwangi
- Streamer fee: KSh 500 per day for 3 days

## Older PlayMechi Schedule

- PUBG Mobile: Friday 8 May 2026 at 8:00 PM EAT, 100 slots
- Call of Duty Mobile: Saturday 9 May 2026 at 8:00 PM EAT, 100 slots
- eFootball: Sunday 10 May 2026 at 8:00 PM EAT, 16 slots

## Older PlayMechi Prizes

- PUBG Mobile: 1st KSh 1,500, 2nd KSh 1,000, 3rd 60 UC
- CODM: 1st KSh 1,200, 2nd KSh 800, 3rd 80 CP
- eFootball: 1st KSh 1,000, 2nd KSh 500, 3rd 315 Coins

## Player Registration Requirements

Players must create or sign into Mechi, pick a game, provide their exact in-game username, phone/WhatsApp, email, Instagram username, YouTube name, confirm match availability, and agree to tournament rules.

## Reward Eligibility

Players must follow PlayMechi on Instagram and subscribe to PlayMechi on YouTube before match day to qualify for rewards where the event requires it. Players who do not complete both can participate, but they are not eligible for prizes or rewards if admin verification requires it.

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
- Paystack payment confirmation checks
- payment/payout questions
- disqualifications
- disputes
- admin group/operator requests
- requests to change tournament rules or results
