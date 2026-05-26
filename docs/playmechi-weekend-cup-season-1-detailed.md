# PlayMechi Android App UI Redesign Blueprint

Date: 2026-05-25

Goal: redesign the PlayMechi Android app into a clean, competitive gaming app that makes tournaments, matches, community, and player identity easy to understand.

## Main App Structure

Keep the app simple with five bottom tabs:

1. Home
2. Arena
3. Feed
4. Community
5. Profile

This structure is strong because each tab has a clear job:

- Home: tells the player what is happening now.
- Arena: handles tournament actions and match-day work.
- Feed: shows official updates, clips, winners, and announcements.
- Community: lets players talk, challenge, and organize.
- Profile: manages identity, game IDs, notifications, support, and account settings.

## Screens Needed

### 1. Splash Screen

Purpose: show the PlayMechi brand while the app checks session state.

Content:

- PlayMechi logo or wordmark.
- Short loading state.
- Dark or branded background.

### 2. Login Screen

Purpose: let existing players access their account quickly.

Content:

- Email or phone input.
- Password input.
- Show/hide password.
- Login button.
- Forgot password link if supported.
- Link to create account.

### 3. Register Screen

Purpose: create a new PlayMechi player account.

Content:

- Name or username.
- Phone or email.
- Password.
- Confirm password if needed.
- Terms acceptance.
- Create account button.

### 4. Onboarding / Player Setup Screen

Purpose: collect player gaming details after account creation.

Content:

- Username.
- Country or region.
- Favorite games.
- PUBG Mobile player ID.
- CODM player ID.
- eFootball player ID.
- WhatsApp contact if needed for tournament support.

### 5. Home Screen

Purpose: act as the player command center.

First viewport should answer:

- Am I registered?
- What tournament is live?
- What should I do next?
- How much time is left?

Recommended order:

1. Player greeting and live tournament status.
2. Main command card with the next action.
3. My match status.
4. Official announcement.
5. Quick actions.

Main actions:

- Register for tournament.
- Go to Arena.
- Check in.
- View room details.
- Upload result proof.
- Contact support.

### 6. Arena Screen

Purpose: become the main match-day desk.

This should be the most polished operational screen in the app.

Recommended order:

1. Game selector: PUBG Mobile, CODM, eFootball.
2. Tournament status strip.
3. Player registration state.
4. Match task rail.
5. Main task panel.
6. Standings, bracket, rules, and prize details.

Match task rail:

- Register
- Check in
- Room
- Fixtures
- Proof
- Results

Important Arena modules:

- Registration status.
- Check-in status.
- Room credentials.
- Copy room ID/password.
- Match timer.
- Opponent or lobby information.
- Upload screenshot/result proof.
- My submitted proof.
- Standings.
- Bracket.
- Dispute/support path.

### 7. Tournament Details Screen

Purpose: give a focused page for one tournament.

Content:

- Tournament name.
- Game.
- Date and time.
- Prize pool.
- Entry requirements.
- Rules.
- Registration deadline.
- Registered player status.
- Register button.

Use this when Home or Feed links to a tournament.

### 8. Registration Confirmation Screen

Purpose: reassure the player after joining a tournament.

Content:

- Success state.
- Tournament name.
- Selected game.
- Player game ID.
- WhatsApp/support reminder.
- Next step.

Primary action:

- Go to Arena.

### 9. Room Details Screen

Purpose: show match room information in a copy-friendly format.

Content:

- Room ID.
- Room password.
- Match start time.
- Check-in state.
- Copy buttons.
- Important rules.
- Support button.

This can be a full screen or an Arena panel.

### 10. Result Proof Upload Screen

Purpose: let players submit match result screenshots.

Content:

- Match/tournament selector.
- Upload image button.
- Preview image.
- Optional notes.
- Submit proof button.
- Submission status.

This must be easy to find from Arena.

### 11. My Submissions Screen

Purpose: show proof upload history.

Content:

- Submitted screenshots.
- Submission time.
- Review status.
- Approved, rejected, or pending labels.
- Re-submit action if allowed.

### 12. Standings Screen

Purpose: show tournament rankings clearly.

Content:

- Rank.
- Player/team.
- Game.
- Points or wins.
- Status.
- Highlight current player.

This can live inside Arena for launch, then become its own screen later.

### 13. Bracket / Fixtures Screen

Purpose: show who plays who and when.

Content:

- Upcoming matches.
- Completed matches.
- Player/team names.
- Match times.
- Scores.
- Current player's next match.

### 14. Feed Screen

Purpose: make PlayMechi feel alive and official.

Content:

- Official posts.
- Tournament announcements.
- Winner posts.
- Clips and images.
- Registration reminders.
- Live tournament updates.

Recommended modules:

- Story/status rail.
- Featured official update.
- Feed post cards.
- Media previews.
- Reactions and share actions.

### 15. Feed Post Detail Screen

Purpose: allow deeper viewing of one announcement, clip, or result post.

Content:

- Full media.
- Caption.
- Time.
- Related tournament.
- Comments or reactions if supported.
- Share action.

### 16. Community Screen

Purpose: make the app feel like a live gaming room.

Content:

- Online count.
- Active tournament label.
- Chat timeline.
- Challenge chips.
- Sticky message composer.

Challenge chips:

- 1v1
- Squad up
- Scrim
- Need teammate
- Practice

### 17. Challenge Screen

Purpose: let players create or accept casual challenges.

Content:

- Game selector.
- Challenge type.
- Player count.
- Time.
- Notes.
- Create challenge button.

This can start as a simple Community panel before becoming a full screen.

### 18. Notifications Screen

Purpose: centralize reminders and tournament alerts.

Content:

- Match reminders.
- Check-in reminders.
- Room opened alerts.
- Proof review updates.
- Community replies.
- Official announcements.

### 19. Profile Screen

Purpose: show player identity and account controls.

Recommended order:

1. Player identity card.
2. Tournament status.
3. Game IDs.
4. Notifications.
5. Support.
6. Account settings.

Content:

- Avatar.
- Username.
- Region.
- Player level or status.
- Registered games.
- Game IDs.
- Support links.
- Sign out.

### 20. Edit Profile Screen

Purpose: let users update account and player details.

Content:

- Avatar.
- Username.
- Phone.
- Region.
- Game IDs.
- Save button.

### 21. Support Screen

Purpose: give players a clear help path.

Content:

- WhatsApp support.
- Tournament issue.
- Payment issue if needed.
- Result dispute.
- Account issue.
- FAQ links.

### 22. Settings Screen

Purpose: handle account preferences.

Content:

- Notification preferences.
- Privacy.
- Linked accounts if supported.
- App version.
- Sign out.

## Best Navigation Arrangement

### Bottom Tabs

Use these five tabs:

- Home
- Arena
- Feed
- Community
- Profile

### Stack Screens Behind Tabs

Home opens:

- Tournament Details
- Registration Confirmation
- Notifications
- Support

Arena opens:

- Tournament Details
- Room Details
- Result Proof Upload
- My Submissions
- Standings
- Bracket / Fixtures
- Support

Feed opens:

- Feed Post Detail
- Tournament Details

Community opens:

- Challenge
- Player Profile Preview
- Support

Profile opens:

- Edit Profile
- Notifications
- Settings
- Support

## Recommended First Release Priority

### P0: Must Redesign First

1. Home
2. Arena
3. Result Proof Upload
4. Profile
5. Login/Register

These screens protect the most important user journeys:

- Join tournament.
- Know what to do next.
- Check in.
- Get room details.
- Submit results.
- Get support.

### P1: Should Improve Next

1. Feed
2. Community
3. Notifications
4. Tournament Details
5. Standings / Bracket

These make the app feel alive and complete.

### P2: Later Polish

1. Challenge screen
2. Player badges
3. Tournament history
4. Advanced reactions
5. Full real-time community features

## Ideal Home Layout

```text
Home
├─ Header
│  ├─ Greeting
│  └─ Notification icon
├─ Live Tournament Command Card
│  ├─ Tournament name
│  ├─ Countdown
│  ├─ Player status
│  └─ Primary next action
├─ My Match Status
│  ├─ Game
│  ├─ Check-in
│  ├─ Room state
│  └─ Proof state
├─ Official Announcement
├─ Quick Actions
│  ├─ Arena
│  ├─ Feed
│  ├─ Community
│  └─ Support
└─ Recent Winners / Highlights
```

## Ideal Arena Layout

```text
Arena
├─ Game Selector
│  ├─ PUBG Mobile
│  ├─ CODM
│  └─ eFootball
├─ Tournament Status Strip
├─ Player State
│  ├─ Registered / Not registered
│  ├─ Checked in / Not checked in
│  └─ Proof pending / submitted
├─ Task Rail
│  ├─ Register
│  ├─ Check in
│  ├─ Room
│  ├─ Fixtures
│  ├─ Proof
│  └─ Results
├─ Active Task Panel
├─ Standings Preview
├─ Rules Preview
└─ Support / Dispute Button
```

## Design Direction

The Android app should feel:

- Competitive.
- Clean.
- Fast.
- Mobile-first.
- Official.
- Community-driven.

Use this visual direction:

- Light app background for readability.
- Dark match-day surfaces for Arena and live tournament states.
- Electric teal for primary actions and active states.
- Coral for urgent actions, warnings, and competitive highlights.
- Compact cards with strong hierarchy.
- Icons for common actions.
- Clear buttons with one obvious primary action per screen.

## Core User Flows

### New Player Flow

```text
Splash
→ Register
→ Onboarding
→ Home
→ Tournament Details
→ Registration Confirmation
→ Arena
```

### Returning Tournament Player Flow

```text
Splash
→ Home
→ Arena
→ Check in
→ Room Details
→ Result Proof Upload
→ My Submissions
```

### Community Player Flow

```text
Home
→ Community
→ Challenge
→ Arena or Chat
```

### Announcement Flow

```text
Home
→ Feed
→ Feed Post Detail
→ Tournament Details
→ Register
```

## Simple Build Order

1. Redesign shared theme and reusable components.
2. Redesign Home as the command center.
3. Redesign Arena as the match-day desk.
4. Make result proof upload impossible to miss.
5. Redesign Profile around player identity.
6. Polish Login, Register, and Onboarding.
7. Improve Feed media cards.
8. Improve Community chat and challenge shell.
9. Add Notifications.
10. Final Android QA and Play Store build.

## Final Recommendation

Do not turn PlayMechi into a generic tournament dashboard. The Android app should feel like a live gaming companion:

- Home tells the player what matters now.
- Arena handles match operations.
- Feed builds hype.
- Community creates player energy.
- Profile makes the player feel known.

That arrangement gives PlayMechi a clear product shape and makes the app easier to redesign without losing the tournament flows that already work.
