# Weekend Cup Full Implementation Plan

> **Target**: Weekend Cup Season 1 (29-31 May 2026)
> **Status**: In Progress
> **Last Updated**: 22 May 2026

---

## Phase 1: Moderator System Updates

### 1.1 Add Free Fire to Moderator Tournaments

**File**: `src/lib/moderator-tournaments.ts`

**Changes**:
```typescript
// Add 'freefire' to ModeratorTournamentGameKey
export type ModeratorTournamentGameKey = 'pubgm' | 'codm' | 'efootball' | 'freefire';

// Add Weekend Cup specific tournament keys
export type ModeratorTournamentKey =
  | 'playmechi_codm'
  | 'playmechi_pubgm'
  | 'playmechi_efootball'
  | 'playmechi_freefire'           // NEW
  | 'weekendcup_pubgm'             // NEW
  | 'weekendcup_codm'              // NEW
  | 'weekendcup_efootball'         // NEW
  | 'weekendcup_freefire'          // NEW
  | 'days_esports_tz_efootball'
  | 'weka_mawe_efootball';

// Add to MODERATOR_TOURNAMENTS array
{
  game: 'freefire',
  key: 'playmechi_freefire',
  label: 'PlayMechi Free Fire',
  shortLabel: 'Free Fire',
},
{
  game: 'pubgm',
  key: 'weekendcup_pubgm',
  label: 'Weekend Cup PUBG',
  shortLabel: 'WC PUBG',
},
{
  game: 'codm',
  key: 'weekendcup_codm',
  label: 'Weekend Cup CODM',
  shortLabel: 'WC CODM',
},
{
  game: 'efootball',
  key: 'weekendcup_efootball',
  label: 'Weekend Cup eFootball',
  shortLabel: 'WC eFootball',
},
{
  game: 'freefire',
  key: 'weekendcup_freefire',
  label: 'Weekend Cup Free Fire',
  shortLabel: 'WC Free Fire',
},
```

---

### 1.2 Post-Login Dialog for Moderators

**New File**: `src/components/ModeratorLoginDialog.tsx`

**Behavior**:
- After successful login, if user has `role: 'moderator'` or `role: 'admin'`
- Show modal dialog with two options:
  - "Go to Moderator Panel" → `/moderators`
  - "Go to Player Dashboard" → `/dashboard`
- Remember choice in localStorage for 24 hours (optional)

**Integration Points**:
- `src/components/auth/AuthLoginScreen.tsx` — trigger dialog after login
- `src/app/moderator-login/page.tsx` — wrap with dialog logic

---

### 1.3 Admin Moderator Password Reset

**New API**: `src/app/api/admin/moderators/reset-password/route.ts`

**Behavior**:
1. Admin provides moderator user ID
2. Generate secure random password (12 chars, alphanumeric)
3. Hash and update `password_hash` in profiles table
4. Return plaintext password to admin (one-time display)
5. Log action in audit log

**Admin UI**: Add to `src/app/admin/moderators/page.tsx`
- List all moderators
- "Reset Password" button per moderator
- Modal shows new credentials after reset

---

## Phase 2: Match Day Controls

### 2.1 Database Schema Updates

**New Table**: `weekend_cup_lobbies`
```sql
CREATE TABLE weekend_cup_lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL,
  game TEXT NOT NULL,
  lobby_number INTEGER NOT NULL,
  room_id TEXT,
  room_password TEXT,
  match_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending', -- pending, active, completed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_slug, game, lobby_number, match_number)
);
```

**New Table**: `weekend_cup_scores`
```sql
CREATE TABLE weekend_cup_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL,
  registration_id UUID NOT NULL REFERENCES online_tournament_registrations(id),
  lobby_id UUID REFERENCES weekend_cup_lobbies(id),
  match_number INTEGER NOT NULL,
  kills INTEGER DEFAULT 0,
  placement INTEGER,
  placement_points INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  screenshot_url TEXT,
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(registration_id, match_number)
);
```

**New Table**: `weekend_cup_results`
```sql
CREATE TABLE weekend_cup_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL,
  game TEXT NOT NULL,
  registration_id UUID NOT NULL REFERENCES online_tournament_registrations(id),
  final_rank INTEGER NOT NULL,
  total_kills INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  prize_type TEXT, -- 'cash', 'credit'
  prize_value TEXT,
  prize_status TEXT DEFAULT 'pending', -- pending, paid, failed
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_slug, game, registration_id)
);
```

---

### 2.2 Lobby Assignment UI

**File**: `src/app/moderators/weekendcup/lobbies/page.tsx`

**Features**:
- View all checked-in players for assigned game
- Auto-assign to lobbies (80 players → 2 lobbies of 40, or 1 lobby of 80)
- Manual reassignment
- Set room ID and password per lobby
- Broadcast room details to players (via WhatsApp group link)

---

### 2.3 Score Entry UI

**File**: `src/app/moderators/weekendcup/scores/page.tsx`

**Features**:
- Select lobby and match number (1, 2, 3)
- Enter kills per player
- Auto-calculate points based on game scoring rules:
  - PUBG: 3 matches on Rondo, Erangel, and Miramar; 1 kill = 1 point + placement
  - CODM: 3 matches on Isolated; 1 kill = 3 points + placement
  - Free Fire: 3 matches on Bermuda, Bermuda, and Solara; 1 kill = 1 point + placement
- Upload screenshot for verification
- Submit scores

---

### 2.4 Result Confirmation UI

**File**: `src/app/moderators/weekendcup/results/page.tsx`

**Features**:
- View aggregated scores across all matches
- Auto-rank by total points
- Confirm top 5 winners
- Mark prize status (pending → paid)
- Generate payout list for admin

---

## Phase 3: eFootball Bracket System

### 3.1 Bracket Tables

**New Table**: `weekend_cup_brackets`
```sql
CREATE TABLE weekend_cup_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug TEXT NOT NULL,
  game TEXT NOT NULL DEFAULT 'efootball',
  round INTEGER NOT NULL, -- 1=R32, 2=R16, 3=QF, 4=SF, 5=Bronze, 6=Final
  match_number INTEGER NOT NULL,
  player1_registration_id UUID REFERENCES online_tournament_registrations(id),
  player2_registration_id UUID REFERENCES online_tournament_registrations(id),
  player1_score INTEGER,
  player2_score INTEGER,
  winner_registration_id UUID REFERENCES online_tournament_registrations(id),
  is_bronze_match BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending', -- pending, active, completed, walkover
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  recording_url TEXT,
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_slug, game, round, match_number)
);
```

### 3.2 Bracket Generation Logic

**File**: `src/lib/weekend-cup-bracket.ts`

**Algorithm**:
1. Get all checked-in eFootball players (max 32)
2. Shuffle for random seeding (or manual seed)
3. Generate Round of 32 matches (16 matches)
4. Run one-leg fixtures
5. As results come in, auto-populate next round
6. Semi-final losers go to Bronze match
7. Final determines 1st/2nd, Bronze determines 3rd/4th

---

### 3.3 Bracket UI

**File**: `src/app/moderators/weekendcup/bracket/page.tsx`

**Features**:
- Visual bracket display (tournament tree)
- Click match to enter result
- Auto-advance winners
- Mark walkovers for no-shows
- Recording upload for QF onwards

---

## Implementation Order

### Step 1: Moderator Tournaments (15 min)
- [x] Update `moderator-tournaments.ts` with Free Fire and Weekend Cup keys

### Step 2: Post-Login Dialog (30 min)
- [ ] Create `ModeratorLoginDialog.tsx`
- [ ] Integrate with login flow

### Step 3: Password Reset (30 min)
- [ ] Create API route
- [ ] Add admin UI
- [ ] Reset all moderator passwords and collect credentials

### Step 4: Database Schema (15 min)
- [ ] Create migration for new tables
- [ ] Run on Supabase

### Step 5: Lobby Assignment (45 min)
- [ ] Create API routes
- [ ] Build UI

### Step 6: Score Entry (45 min)
- [ ] Create API routes
- [ ] Build UI

### Step 7: Results (30 min)
- [ ] Create API routes
- [ ] Build UI

### Step 8: eFootball Bracket (60 min)
- [ ] Create bracket generation logic
- [ ] Create API routes
- [ ] Build bracket UI

### Step 9: Testing & Push (30 min)
- [ ] Test all flows
- [ ] Push to production

---

## Moderator Credentials (To Be Generated)

| Game | Username | Phone | Password | Status |
|------|----------|-------|----------|--------|
| PUBG Mobile | TBD | TBD | TBD | Pending |
| CODM | TBD | TBD | TBD | Pending |
| eFootball | gamer_mastaa19 | TBD | TBD | Pending |
| Free Fire | TBD | TBD | TBD | Pending |

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/moderators/reset-password` | POST | Reset moderator password |
| `/api/moderators/weekendcup/lobbies` | GET/POST | Lobby management |
| `/api/moderators/weekendcup/scores` | GET/POST | Score entry |
| `/api/moderators/weekendcup/results` | GET/POST | Result confirmation |
| `/api/moderators/weekendcup/bracket` | GET/POST | Bracket management |

---

## Notes

- All moderator actions are scoped to their assigned game
- Admin can see/edit all games
- Audit logging for all sensitive actions
- WhatsApp integration for player notifications (future)
