# PlayMechi Matchmaking Dashboard — Implementation Plan

**Date:** 29 May 2026
**Status:** Analysis Complete
**Objective:** Transform PlayMechi into a dashboard-first matchmaking platform

---

## Executive Summary

Your repo has **strong tournament and event infrastructure** (Weekend Cup, Online Tournament) but **lacks the core matchmaking dashboard** described in the plan. The plan requires building:

1. **Player-first dashboard** (not tournament-focused)
2. **Challenge board** (open challenges, direct challenges)
3. **Match rooms** (central hub for every match)
4. **Result confirmation** (mutual + screenshot proof)
5. **Ranking system** (per-game ratings)
6. **Subscription tiers** (Free, Pro Daily/Weekly/Monthly, Elite Daily/Weekly/Monthly)
7. **Admin operations** (dispute resolution, user management)

---

## Current State Analysis

### ✅ What You Have

#### Tournament & Event Infrastructure
- `src/lib/online-tournament.ts` — Game configs, prize pools, scoring rules
- `src/lib/weekend-cup.ts` — Weekend Cup event constants, registration logic
- `src/app/weekendcup/` — Registration, dashboard, moderator tools
- `src/app/online-gaming-tournament/` — Tournament results, leaderboards
- `src/app/moderators/` — Moderator tools for result verification
- **Supabase integration** — Auth, database, real-time capabilities
- **Payment integration** — Paystack for tournament entry fees
- **Notification system** — Telegram, email notifications

#### Player Infrastructure
- `src/components/AuthProvider.tsx` — User authentication
- `src/lib/auth.ts` — Auth utilities
- User profiles (via Supabase)
- Game ID management (for tournaments)

#### UI Foundation
- Dark theme (navy + teal + coral)
- Lucide icons
- Responsive layout
- Component library (buttons, cards, badges, tables)

### ❌ What's Missing

#### Core Matchmaking
- ❌ Challenge board (`/dashboard/challenges`)
- ❌ Challenge creation flow
- ❌ Open challenges listing
- ❌ Challenge acceptance
- ❌ Queue-based matchmaking (`/dashboard/play`)
- ❌ Opponent matching logic

#### Match Management
- ❌ Match room page (`/dashboard/matches/[matchId]`)
- ❌ Match status tracking
- ❌ Game ID display in match context
- ❌ Match timeline
- ❌ Result submission UI
- ❌ Screenshot upload
- ❌ Opponent confirmation flow

#### Ranking & Progression
- ❌ Per-game rating system
- ❌ Rank tiers (Bronze III → Legend)
- ❌ Leaderboards (overall, per-game, weekly, monthly)
- ❌ Win/loss tracking
- ❌ Streak tracking
- ❌ Rating point calculations

#### Subscriptions
- ❌ Free plan limits (5 ranked matches/day)
- ❌ Pro Daily (KES 20)
- ❌ Pro Weekly (KES 70)
- ❌ Pro Monthly (KES 199)
- ❌ Elite Daily (KES 50)
- ❌ Elite Weekly (KES 199)
- ❌ Elite Monthly (KES 699)
- ❌ Feature locking per plan
- ❌ Subscription status display
- ❌ Upgrade prompts

#### Dashboard
- ❌ Player dashboard home (`/dashboard`)
- ❌ Sidebar navigation
- ❌ Play Now card
- ❌ Active Match card
- ❌ Pending Actions card
- ❌ Open Challenges card
- ❌ Rank Progress card
- ❌ My Tournaments card
- ❌ Rewards card
- ❌ Subscription status card

#### Dispute System
- ❌ Dispute creation UI
- ❌ Dispute evidence upload
- ❌ Moderator review queue
- ❌ Dispute decision display
- ❌ Penalties system

#### Admin Dashboard
- ❌ Admin home (`/admin`)
- ❌ Live activity metrics
- ❌ User management
- ❌ Match management
- ❌ Dispute queue
- ❌ Payment management
- ❌ Content management

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Goal:** Build the dashboard shell and design system

#### 1.1 Design Tokens & Theme
- **File:** `src/lib/design-tokens.ts`
- **Create:**
  - Color tokens (background, surface, border, primary, danger, status)
  - Spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px)
  - Border radius tokens
  - Shadow tokens
  - Typography tokens
  - Status color mappings

#### 1.2 Core UI Components
- **Location:** `src/components/ui/`
- **Build:**
  - `Button.tsx` (variants: primary, secondary, ghost, danger)
  - `Card.tsx` (with padding, border, shadow)
  - `Badge.tsx` (status badges: Open, Accepted, Pending, etc.)
  - `Tabs.tsx` (for challenge board, match history)
  - `Table.tsx` (for leaderboards, match lists)
  - `EmptyState.tsx` (with icon, title, description, CTA)
  - `StatCard.tsx` (for metrics)
  - `Avatar.tsx` (player avatars)
  - `Modal.tsx` (for create challenge, confirm result)
  - `Toast.tsx` (notifications)

#### 1.3 Dashboard Shell
- **Location:** `src/app/dashboard/layout.tsx`
- **Build:**
  - Sidebar with navigation groups (Main, Player, Account)
  - Top bar with user profile, notifications, quick actions
  - Responsive mobile layout (bottom nav on mobile)
  - Conditional admin/moderator sections
  - Dark theme styling

**Acceptance Criteria:**
- Dashboard shell renders on all screen sizes
- Sidebar collapses on mobile
- Navigation links work
- User can see their profile and logout

---

### Phase 2: Player Setup (Week 2)
**Goal:** Players can create a complete gaming profile

#### 2.1 Dashboard Home
- **Route:** `/dashboard`
- **Build:**
  - Welcome section with quick actions
  - Play Now card (game selector, mode selector, Find Match button)
  - Active Match card (if user has active match)
  - Pending Actions card (list of things to do)
  - Open Challenges card (challenges user can accept)
  - Rank Progress card (current rank, wins needed to rank up)
  - My Tournaments card (joined tournaments)
  - Rewards card (daily mission, streaks, badges)
  - Subscription status card (current plan, features, upgrade CTA)
  - Announcements section (Weekend Cup, streams, etc.)

#### 2.2 Player Profile
- **Route:** `/dashboard/profile`
- **Build:**
  - Display name, avatar, bio
  - Main game selection
  - Social links (Instagram, YouTube, TikTok)
  - Account settings
  - Privacy settings
  - Edit profile form

#### 2.3 Game IDs Management
- **Route:** `/dashboard/game-ids`
- **Build:**
  - List of games with input fields
  - Add game ID form
  - Verify game ID button
  - Delete game ID option
  - Show which games are verified

**Acceptance Criteria:**
- Player can set their game IDs
- Dashboard shows player's current plan
- Player can see their rank (if any)
- Empty states show when no data exists

---

### Phase 3: Challenge Board (Week 3)
**Goal:** Players can create and accept challenges

#### 3.1 Challenge Board Page
- **Route:** `/dashboard/challenges`
- **Build:**
  - Tabs: Open, My Challenges, Sent, Received, Completed, Disputed
  - Challenge list with filters (game, platform, rank, time)
  - Create Challenge button (opens modal)
  - Accept Challenge button on each card
  - Challenge status badges

#### 3.2 Create Challenge Modal
- **Location:** `src/components/challenges/CreateChallengeModal.tsx`
- **Fields:**
  - Game (dropdown)
  - Mode (dropdown: 1v1, 2v2, etc.)
  - Platform (dropdown)
  - Casual or Ranked (toggle)
  - Preferred time (now, tonight, tomorrow, custom)
  - Rank range (optional)
  - Notes (optional)
  - Expiry time (default 24h)

#### 3.3 Challenge Card Component
- **Location:** `src/components/challenges/ChallengeCard.tsx`
- **Display:**
  - Creator name + avatar
  - Game, mode, platform
  - Rank range
  - Scheduled time
  - Status badge
  - Accept button (if not creator)
  - Cancel button (if creator)

#### 3.4 Challenge Filters
- **Location:** `src/components/challenges/ChallengeFilters.tsx`
- **Filters:**
  - Game
  - Platform
  - Rank range
  - Time (Now, Tonight, Tomorrow, Custom)
  - Status (Open, Accepted, Expired)

**Database Tables Needed:**
```sql
CREATE TABLE challenges (
  id UUID PRIMARY KEY,
  creator_id UUID NOT NULL,
  accepted_by UUID,
  game_id UUID NOT NULL,
  mode VARCHAR,
  platform VARCHAR,
  rank_range VARCHAR,
  scheduled_time TIMESTAMP,
  status VARCHAR, -- draft, open, accepted, expired, cancelled
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Acceptance Criteria:**
- User can create a challenge
- Challenge appears on open board
- Other users can accept challenge
- Challenge expires after set time
- Creator can cancel challenge

---

### Phase 4: Match Rooms (Week 4)
**Goal:** Every match has a central hub

#### 4.1 Match Room Page
- **Route:** `/dashboard/matches/[matchId]`
- **Build:**
  - Match header (ID, players, game, mode, status)
  - Player cards (name, rank, avatar, game ID)
  - Game info section (platform, mode, rules, maps)
  - Deadline countdown
  - Result submission section
  - Screenshot upload
  - Confirm result button
  - Dispute button
  - Match timeline (created, accepted, result submitted, confirmed, etc.)
  - Chat/comments section

#### 4.2 Result Submission Form
- **Location:** `src/components/matches/ResultSubmissionForm.tsx`
- **Fields:**
  - Winner (radio: Player 1 or Player 2)
  - Score (if applicable)
  - Screenshot upload
  - Notes
  - Submit button

#### 4.3 Match Timeline
- **Location:** `src/components/matches/MatchTimeline.tsx`
- **Show:**
  - Match created
  - Challenge accepted
  - Match room opened
  - Result submitted
  - Result confirmed
  - Match finalized
  - Dispute opened (if any)

#### 4.4 Dispute Panel
- **Location:** `src/components/matches/DisputePanel.tsx`
- **Show:**
  - Dispute reason
  - Evidence
  - Moderator decision (if resolved)
  - Penalties (if any)

**Database Tables Needed:**
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  challenge_id UUID,
  player_one_id UUID NOT NULL,
  player_two_id UUID NOT NULL,
  game_id UUID NOT NULL,
  mode VARCHAR,
  platform VARCHAR,
  status VARCHAR, -- waiting, ready, in_progress, awaiting_result, result_submitted, awaiting_confirmation, disputed, finalized
  deadline TIMESTAMP,
  winner_id UUID,
  rating_processed BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE results (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL,
  submitted_by UUID NOT NULL,
  player_one_score INT,
  player_two_score INT,
  screenshot_url VARCHAR,
  confirmation_status VARCHAR, -- not_submitted, submitted, confirmed, auto_confirmed, disputed
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Acceptance Criteria:**
- Match room displays all required info
- Player can submit result with screenshot
- Opponent can confirm result
- Result auto-confirms after 60 minutes if not disputed
- Dispute button is available

---

### Phase 5: Results & Ranking (Week 5)
**Goal:** Players can compete and progress

#### 5.1 Ranking System
- **Location:** `src/lib/ranking.ts`
- **Implement:**
  - Rating points calculation (win/loss/draw)
  - Tier assignment (Bronze III → Legend)
  - Per-game ratings
  - Streak tracking
  - No-show penalties
  - Dispute penalties

#### 5.2 Leaderboard Pages
- **Routes:**
  - `/dashboard/leaderboard` (overall)
  - `/dashboard/leaderboard/[game]` (per-game)
  - `/dashboard/leaderboard/weekly` (weekly)
  - `/dashboard/leaderboard/monthly` (monthly)

- **Build:**
  - Leaderboard table (rank, player, rating, wins, losses, streak)
  - Filter by game
  - Filter by time period
  - Search player
  - Highlight current user

#### 5.3 Player Stats
- **Location:** `src/components/dashboard/PlayerStatsCard.tsx`
- **Show:**
  - Current rank (per game)
  - Win rate
  - Current streak
  - Best streak
  - Matches played
  - Rank progress (points to next rank)

#### 5.4 Match History
- **Route:** `/dashboard/results`
- **Build:**
  - List of all matches (completed, disputed, voided)
  - Filter by game, status, date
  - Match details (opponent, result, date, rating change)
  - Dispute status if applicable

**Database Tables Needed:**
```sql
CREATE TABLE ratings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  game_id UUID NOT NULL,
  rating_points INT DEFAULT 1000,
  tier VARCHAR, -- bronze_iii, bronze_ii, bronze_i, silver_iii, ..., legend
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  draws INT DEFAULT 0,
  streak INT DEFAULT 0,
  best_streak INT DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, game_id)
);
```

**Acceptance Criteria:**
- Rating updates after match completion
- Leaderboard shows top 100 players
- Player can see their rank progress
- Match history shows all completed matches
- Rating change is displayed (+10, -5, etc.)

---

### Phase 6: Subscriptions (Week 6)
**Goal:** Start monetizing active players

#### 6.1 Subscription Plans
- **Location:** `src/lib/subscriptions.ts`
- **Define:**
  - Free (KES 0)
  - Pro Daily (KES 20)
  - Pro Weekly (KES 70)
  - Pro Monthly (KES 199)
  - Elite Daily (KES 50)
  - Elite Weekly (KES 199)
  - Elite Monthly (KES 699)

#### 6.2 Subscription Page
- **Route:** `/dashboard/subscription`
- **Build:**
  - Current plan card (plan name, expiry, features)
  - Plan comparison table
  - Upgrade buttons
  - Payment history
  - Billing info

#### 6.3 Plan Features
- **Free:**
  - 5 ranked matches/day
  - Unlimited casual challenges
  - 1 selected game
  - Basic leaderboard
  - 10-match history

- **Pro:**
  - Unlimited ranked matches
  - Up to 3 selected games
  - 100-match history
  - Advanced stats
  - Pro badge
  - Priority challenge visibility

- **Elite:**
  - Everything in Pro
  - Host tournaments
  - 5+ selected games
  - Unlimited match history
  - CSV export
  - Elite badge
  - Featured profile

#### 6.4 Feature Locking
- **Location:** `src/lib/permissions.ts`
- **Implement:**
  - Check user's plan before allowing action
  - Show upgrade prompt when limit reached
  - Lock Pro/Elite-only features
  - Track daily ranked match count

#### 6.5 Payment Integration
- **Use:** Paystack (already integrated)
- **Implement:**
  - One-time pass purchases (Daily, Weekly)
  - Recurring subscriptions (Monthly)
  - Payment status tracking
  - Expiry logic
  - Auto-renewal (if supported)

**Database Tables Needed:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan VARCHAR, -- free, pro_daily, pro_weekly, pro_monthly, elite_daily, elite_weekly, elite_monthly
  billing_period VARCHAR, -- daily, weekly, monthly
  status VARCHAR, -- active, expiring_soon, expired, cancelled
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  payment_reference VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INT,
  currency VARCHAR,
  purpose VARCHAR, -- subscription, tournament_entry
  provider VARCHAR, -- paystack
  reference VARCHAR,
  status VARCHAR, -- pending, completed, failed
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Acceptance Criteria:**
- Free users see "5 ranked matches left today"
- Pro users can play unlimited ranked matches
- Elite users can host tournaments
- Upgrade prompts appear when limits reached
- Payment is processed via Paystack
- Subscription expires correctly

---

### Phase 7: Admin Dashboard (Week 7)
**Goal:** PlayMechi can operate safely

#### 7.1 Admin Home
- **Route:** `/admin`
- **Build:**
  - Metric cards (active players, live matches, open challenges, pending results, open disputes, paid users, revenue)
  - Live match feed (recent matches)
  - Pending result reviews (results awaiting verification)
  - Dispute queue (open disputes)
  - Risk alerts (suspicious activity)
  - System announcements

#### 7.2 Admin Sidebar
- **Sections:**
  - Overview (Home, Live Activity, Alerts)
  - Players (Users, Profiles, Game IDs, Trust Scores)
  - Competition (Matches, Challenges, Results, Disputes, Leaderboards)
  - Events (Tournaments, Participants, Brackets, Hosts)
  - Business (Subscriptions, Payments, Refunds, Revenue)
  - Platform (Games, Rules, Notifications, Content Banners, Support Tickets)
  - Security (Reports, Suspensions, Audit Logs, Moderators)
  - Settings (Platform Settings, Roles & Permissions)

#### 7.3 Admin User Management
- **Route:** `/admin/users`
- **Build:**
  - User table (username, email, plan, rank, matches, disputes, trust score, status)
  - Search and filters
  - View user details
  - Suspend/ban user
  - Change plan
  - Add notes

#### 7.4 Admin Match Management
- **Route:** `/admin/matches`
- **Build:**
  - Match table (ID, players, game, status, deadline)
  - View match details
  - Finalize result
  - Void match
  - Force rematch
  - Extend deadline

#### 7.5 Admin Dispute Queue
- **Route:** `/admin/disputes`
- **Build:**
  - Dispute table (ID, match, reason, status, opened by)
  - View dispute details
  - Review evidence
  - Make decision (Player A wins, Player B wins, Void, Rematch, etc.)
  - Issue penalties
  - Add moderator notes

#### 7.6 Admin Roles
- **Implement:**
  - Super Admin (full access)
  - Admin (most tools)
  - Moderator (results, disputes, reports)
  - Tournament Host (own tournament only)
  - Support Agent (tickets, user support)
  - Content Manager (banners, announcements)

**Database Tables Needed:**
```sql
CREATE TABLE disputes (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL,
  opened_by UUID NOT NULL,
  reason VARCHAR,
  evidence_url VARCHAR,
  status VARCHAR, -- open, under_review, resolved, closed
  moderator_id UUID,
  decision VARCHAR, -- player_a_wins, player_b_wins, void, rematch, no_show_loss, both_penalized
  penalty VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE admin_logs (
  id UUID PRIMARY KEY,
  admin_id UUID NOT NULL,
  action VARCHAR,
  target_type VARCHAR, -- user, match, dispute, subscription
  target_id UUID,
  notes VARCHAR,
  created_at TIMESTAMP
);
```

**Acceptance Criteria:**
- Admin can view all matches
- Admin can resolve disputes
- Admin can suspend users
- Admin can change user plans
- Moderators can only resolve disputes (not change plans)
- All admin actions are logged

---

### Phase 8: Private Beta (Week 8)
**Goal:** Test with real players

#### 8.1 Beta Invite
- Invite 50–100 players
- Start with: eFootball, CODM, Free Fire

#### 8.2 Track Metrics
- Matches created
- Matches completed
- Disputes
- No-shows
- Subscription interest
- UI confusion
- Mobile usability

#### 8.3 Feedback Loop
- Daily standup on metrics
- Fix critical bugs
- Iterate on UX
- Gather player feedback

---

## Database Schema Summary

### Core Tables
```
users
├── id, username, email, phone, password_hash, country, role, plan, status
├── created_at, updated_at

profiles
├── id, user_id, display_name, avatar, bio, main_game, rank_summary, social_links, trust_score
├── created_at, updated_at

games
├── id, name, platforms[], modes[], proof_requirements, rules, status
├── created_at, updated_at

player_game_ids
├── id, user_id, game_id, platform, game_username, game_uid, verified_status
├── created_at, updated_at

challenges
├── id, creator_id, accepted_by, game_id, mode, platform, rank_range, scheduled_time, status, expires_at
├── created_at, updated_at

matches
├── id, challenge_id, player_one_id, player_two_id, game_id, mode, platform, status, deadline, winner_id, rating_processed
├── created_at, updated_at

results
├── id, match_id, submitted_by, player_one_score, player_two_score, screenshot_url, confirmation_status
├── created_at, updated_at

disputes
├── id, match_id, opened_by, reason, evidence_url, status, moderator_id, decision, penalty
├── created_at, updated_at

ratings
├── id, user_id, game_id, rating_points, tier, wins, losses, draws, streak, best_streak
├── created_at, updated_at
├── UNIQUE(user_id, game_id)

subscriptions
├── id, user_id, plan, billing_period, status, start_date, end_date, payment_reference
├── created_at, updated_at

payments
├── id, user_id, amount, currency, purpose, provider, reference, status
├── created_at, updated_at

notifications
├── id, user_id, type, title, message, read_status, action_url
├── created_at

admin_logs
├── id, admin_id, action, target_type, target_id, notes
├── created_at
```

---

## File Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── layout.tsx (shell)
│   │   ├── page.tsx (home)
│   │   ├── play/
│   │   ├── challenges/
│   │   ├── matches/
│   │   │   ├── page.tsx
│   │   │   └── [matchId]/
│   │   ├── tournaments/
│   │   ├── leaderboard/
│   │   ├── games/
│   │   ├── game-ids/
│   │   ├── results/
│   │   ├── disputes/
│   │   ├── rewards/
│   │   ├── profile/
│   │   ├── subscription/
│   │   ├── payments/
│   │   ├── notifications/
│   │   └── support/
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── users/
│   │   ├── matches/
│   │   ├── disputes/
│   │   ├── subscriptions/
│   │   ├── payments/
│   │   ├── tournaments/
│   │   ├── content/
│   │   └── settings/
│   └── api/
│       ├── challenges/
│       ├── matches/
│       ├── results/
│       ├── disputes/
│       ├── ratings/
│       ├── subscriptions/
│       └── admin/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Tabs.tsx
│   │   ├── Table.tsx
│   │   ├── EmptyState.tsx
│   │   ├── StatCard.tsx
│   │   ├── Avatar.tsx
│   │   ├── Modal.tsx
│   │   └── Toast.tsx
│   ├── dashboard/
│   │   ├── DashboardShell.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── PlayNowCard.tsx
│   │   ├── ActiveMatchCard.tsx
│   │   ├── PendingActionsCard.tsx
│   │   ├── RankProgressCard.tsx
│   │   └── SubscriptionStatusCard.tsx
│   ├── challenges/
│   │   ├── ChallengeCard.tsx
│   │   ├── CreateChallengeModal.tsx
│   │   └── ChallengeFilters.tsx
│   ├── matches/
│   │   ├── MatchRoomHeader.tsx
│   │   ├── ResultSubmissionForm.tsx
│   │   ├── MatchTimeline.tsx
│   │   └── DisputePanel.tsx
│   ├── subscriptions/
│   │   ├── PlanCard.tsx
│   │   ├── PlanComparison.tsx
│   │   └── CurrentPlanCard.tsx
│   └── admin/
│       ├── AdminShell.tsx
│       ├── AdminMetricCard.tsx
│       ├── AdminTable.tsx
│       └── DisputeQueue.tsx
└── lib/
    ├── design-tokens.ts
    ├── ranking.ts
    ├── subscriptions.ts
    ├── permissions.ts
    ├── matchmaking.ts
    ├── notifications.ts
    └── admin/
        ├── user-management.ts
        ├── dispute-resolution.ts
        └── analytics.ts
```

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create design tokens file
- [ ] Build core UI components (Button, Card, Badge, Tabs, Table, EmptyState, etc.)
- [ ] Build dashboard shell (layout, sidebar, topbar)
- [ ] Make responsive (desktop, tablet, mobile)
- [ ] Test navigation

### Phase 2: Player Setup
- [ ] Build dashboard home page
- [ ] Build player profile page
- [ ] Build game IDs management page
- [ ] Add subscription status card
- [ ] Test empty states

### Phase 3: Challenge Board
- [ ] Build challenge board page with tabs
- [ ] Build create challenge modal
- [ ] Build challenge card component
- [ ] Build challenge filters
- [ ] Create challenges table in database
- [ ] Test challenge creation and acceptance

### Phase 4: Match Rooms
- [ ] Build match room page
- [ ] Build result submission form
- [ ] Build match timeline
- [ ] Build dispute panel
- [ ] Create matches and results tables
- [ ] Test result submission and confirmation

### Phase 5: Results & Ranking
- [ ] Implement rating calculation logic
- [ ] Build leaderboard pages
- [ ] Build player stats card
- [ ] Build match history page
- [ ] Create ratings table
- [ ] Test rating updates

### Phase 6: Subscriptions
- [ ] Define subscription plans
- [ ] Build subscription page
- [ ] Implement feature locking
- [ ] Integrate Paystack for payments
- [ ] Create subscriptions and payments tables
- [ ] Test plan upgrades and expiry

### Phase 7: Admin Dashboard
- [ ] Build admin home page
- [ ] Build user management page
- [ ] Build match management page
- [ ] Build dispute queue page
- [ ] Implement admin roles
- [ ] Create admin logs table
- [ ] Test admin actions

### Phase 8: Beta
- [ ] Invite beta players
- [ ] Track metrics
- [ ] Fix bugs
- [ ] Gather feedback
- [ ] Iterate on UX

---

## Success Metrics

### Player Activity
- Daily active users
- Weekly active users
- Matches created per day
- Matches completed per day
- Challenge acceptance rate

### Quality
- Dispute rate (target: <5%)
- No-show rate (target: <10%)
- Match completion rate (target: >90%)

### Monetization
- Free users
- Pro Daily/Weekly/Monthly users
- Elite Daily/Weekly/Monthly users
- Pro conversion rate (target: 10%)
- Elite conversion rate (target: 2%)
- Monthly recurring revenue

---

## Next Steps

1. **Start Phase 1 immediately** — Design system and dashboard shell are blocking everything else
2. **Use Codex for component building** — Give specific, structured tasks with acceptance criteria
3. **Test with real data** — Don't use fake numbers
4. **Review UI manually** — Every screen should feel like PlayMechi, not generic SaaS
5. **Iterate fast** — Beta feedback will guide refinements

---

## Key Principles

✅ **Dashboard-first** — All player activity happens inside the dashboard
✅ **Action-first** — Every card has one clear primary action
✅ **Status-driven** — Use color and badges to communicate state
✅ **Real data** — No fake player counts or testimonials
✅ **Functional** — Dark, fast, sharp, clean
✅ **Mobile-ready** — Many players will use phones
✅ **Accessible** — Keyboard navigation, clear labels, good contrast

---

**Status:** Ready for Phase 1 implementation
**Owner:** Cascade + Codex
**Timeline:** 8 weeks to MVP
