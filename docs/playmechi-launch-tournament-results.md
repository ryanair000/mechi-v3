# PlayMechi Launch Tournament — Complete Results

**Event:** Mechi Club Online Gaming Tournament (PlayMechi Launch)
**Dates:** 8–10 May 2026
**Total prize pool:** KSh 6,000
**Games:** PUBG Mobile · CODM · eFootball
**Platform:** mechi.club/playmechi

---

## PUBG Mobile
**Date:** Friday 8 May 2026, 8:00 PM EAT
**Format:** Individual Battle Royale — 3 matches
**Scoring:** 1 kill = 1 point. Placement has no points. Tiebreaker: best single-match kills, then Match 3 placement.

### Prizes
| Place | Prize |
|-------|-------|
| 🥇 1st | KSh 1,500 |
| 🥈 2nd | KSh 1,000 |
| 🥉 3rd | 60 UC |

### Final Standings

| Rank | Player | M1 Kills | M2 Kills | M3 Kills | **Total** | M3 Placement |
|------|--------|----------|----------|----------|-----------|--------------|
| 🥇 1 | HM』TOP | 8 | 3 | 2 | **13** | 16th |
| 🥈 2 | BpxE͜͡thoX炎 | 2 | – | 10 | **12** | 1st |
| 🥉 3 | CallMeSparKi | 3 | 2 | 2 | **7** | 3rd |
| 4 | SB・B3NTOSH | 1 | 3 | 3 | **7** | 12th |
| 5 | AP乄NUNEZ | – | – | 6 | **6** | 2nd |
| 6 | GodLike \| Kaal | – | 6 | – | **6** | – |
| 7 | onlyJAYMIE | 1 | 1 | 1 | **3** | 14th |
| 8 | FÊÄRMËAGAIN | – | – | 2 | **2** | 18th |
| 9 | RoW・ESCANOR | 2 | – | – | **2** | – |
| 10 | S2GZenos2v1 | – | – | 1 | **1** | 24th |
| 11 | 1TE MURIFE¥ | – | 1 | – | **1** | – |
| 12 | RondaShii | – | – | 0 | **0** | 4th |
| 13 | 『m尺』SLAYER | – | 0 | 0 | **0** | 5th |
| 14 | B4RR1C403 | – | – | 0 | **0** | 6th |
| 15 | nellycool23 | 0 | 0 | 0 | **0** | 7th |
| 16 | 7TS亗MUFASA。 | 0 | – | 0 | **0** | 8th |
| 17 | DenisWamanga | – | – | 0 | **0** | 9th |
| 18 | Rønøø | – | – | 0 | **0** | 10th |
| 19 | TC么KÄRIYÕ | 0 | – | 0 | **0** | 11th |
| 20 | Bazengashakes | – | – | 0 | **0** | 13th |
| 21 | ¤y¤ragu | – | – | 0 | **0** | 15th |
| 22 | TC么RËBÉL | 0 | 0 | 0 | **0** | 17th |
| 23 | 『ST』DEELAN | 0 | – | 0 | **0** | 19th |
| 24 | VB丨RAKSHA | 0 | – | 0 | **0** | 20th |
| 25 | SB・STAR BORN | 0 | – | 0 | **0** | 21st |
| 26 | hollyjoh | – | – | 0 | **0** | 22nd |
| 27 | SB・OZAI | – | – | 0 | **0** | 23rd |
| 28 | SaVaGE | – | – | 0 | **0** | 25th |
| 29 | ROBIN亗SNIPE | 0 | – | – | **0** | – |
| 30 | KHUBAYB51 | 0 | – | – | **0** | – |
| 31 | TC么VÉÑÒMG | 0 | – | – | **0** | – |
| 32 | tayshotzzz | 0 | – | – | **0** | – |
| 33 | GNFxPAPJ | 0 | 0 | – | **0** | – |
| 34 | 『m尺』Partel | – | 0 | – | **0** | – |
| 35 | wHiteShadow | – | 0 | – | **0** | – |
| 36 | KIDURA | – | 0 | – | **0** | – |
| 37 | 1tkeBATMAN | – | 0 | – | **0** | – |

> **–** = did not participate / no submission recorded for that match.

---

## CODM (Call of Duty Mobile)
**Date:** Saturday 9 May 2026, 8:00 PM EAT
**Format:** Individual Battle Royale — 3 matches
**Scoring:** 1 kill = 3 pts. Placement: #1 20pts, #2 15pts, #3 10pts, #4 5pts, #5-25 3pts.

### Prizes
| Place | Prize |
|-------|-------|
| 🥇 1st | KSh 1,200 |
| 🥈 2nd | KSh 800 |
| 🥉 3rd | 80 CP |

### Final Standings

> CODM match results are stored in Supabase live records and were not captured in the static fallback dataset. Retrieve from Supabase using:
>
> ```sql
> SELECT r.in_game_username, SUM(s.kills) AS total_kills,
>        MAX(s.kills) AS best_match_kills
> FROM online_tournament_result_submissions s
> JOIN online_tournament_registrations r ON r.id = s.registration_id
> WHERE s.event_slug = 'mechi-online-gaming-tournament'
>   AND s.game = 'codm'
>   AND s.status = 'verified'
> GROUP BY r.in_game_username
> ORDER BY total_kills DESC, best_match_kills DESC;
> ```

---

## eFootball
**Date:** Sunday 10 May 2026, 8:00 PM EAT
**Format:** 1v1 knockout bracket — Round of 16 to Final
**Scoring:** One leg per fixture. Draws go to extra time / penalties / golden goal replay.

### Prizes
| Place | Prize |
|-------|-------|
| 🥇 1st | KSh 1,000 |
| 🥈 2nd | KSh 500 |
| 🥉 3rd | 315 Coins |

### Champion

**🥇 Samuuo11** — defeated BClout-XVII in the Final **8–2**

### Full Bracket

#### Round of 16

| Slot | Player 1 | Score | Player 2 | Winner |
|------|----------|-------|----------|--------|
| 1 | Samuuo11 | **4–1** | COBY_CR7 | Samuuo11 ✓ |
| 2 | TASH_KID | 0–3 | ASDH-559-563-850 | ASDH-559-563-850 ✓ |
| 3 | n3xphase | — | *(bye)* | n3xphase ✓ |
| 4 | GaddyTheGamer | — | *(bye)* | GaddyTheGamer ✓ |
| 5 | KID_PICKER | — | *(bye)* | KID_PICKER ✓ |
| 6 | sammykratos | 0–1 | BClout-XVII | BClout-XVII ✓ |
| 7 | Foxxy22_ | — | *(bye)* | Foxxy22_ ✓ |
| 8 | Oloh-Messi | — | *(bye)* | Oloh-Messi ✓ |

#### Quarterfinals

| Match | Player 1 | Score | Player 2 | Winner |
|-------|----------|-------|----------|--------|
| QF1 | Samuuo11 | **6–1** | ASDH-559-563-850 | Samuuo11 ✓ |
| QF2 | n3xphase | **7–2** | GaddyTheGamer | n3xphase ✓ |
| QF3 | KID_PICKER | 3–6 | BClout-XVII | BClout-XVII ✓ |
| QF4 | Foxxy22_ | 1–12 | Oloh-Messi | Oloh-Messi ✓ |

#### Semifinals

| Match | Player 1 | Score | Player 2 | Winner |
|-------|----------|-------|----------|--------|
| SF1 | Samuuo11 | **9–1** | n3xphase | Samuuo11 ✓ |
| SF2 | BClout-XVII | **4–1** | Oloh-Messi | BClout-XVII ✓ |

#### Final

| Player 1 | Score | Player 2 | Winner |
|----------|-------|----------|--------|
| **Samuuo11** | **8–2** | BClout-XVII | **Samuuo11 🏆** |

### Final Standings

| Rank | Player |
|------|--------|
| 🥇 1st | **Samuuo11** |
| 🥈 2nd | BClout-XVII |
| 🥉 3rd | n3xphase *(SF loss)* |
| 🥉 3rd | Oloh-Messi *(SF loss)* |
| 5th | KID_PICKER |
| 5th | GaddyTheGamer |
| 5th | Foxxy22_ |
| 5th | ASDH-559-563-850 |
| 9th | COBY_CR7 |
| 9th | TASH_KID |
| 9th | sammykratos |

---

## Summary

| Game | Champion | Runner-up | 3rd Place |
|------|----------|-----------|-----------|
| PUBG Mobile | **HM』TOP** (13 kills) | BpxE͜͡thoX炎 (12 kills) | CallMeSparKi (7 kills) |
| CODM | *(see Supabase)* | — | — |
| eFootball | **Samuuo11** (8–2 Final) | BClout-XVII | n3xphase / Oloh-Messi |

---

*Results sourced from verified match submissions and static fallback dataset committed 2026-05-13. CODM live records are in Supabase `online_tournament_result_submissions`.*
