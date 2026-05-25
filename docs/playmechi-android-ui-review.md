# PlayMechi Android UI Review

Date: 2026-05-25

Goal: make the Android app feel world-class, neat, organized, and clearly built for competitive community gaming.

## Executive Read

The current PlayMechi Android app has the right product direction: Home, Arena, Feed, Community, and Profile are the correct five pillars. The issue is presentation and hierarchy. Too many screens read like stacked white cards with similar weight, so users do not immediately know what matters now, what is live, and what action they should take next.

The strongest product idea is Arena as a match-day desk. That should become the app's most polished, most operational screen. Home should act like a command center, Feed should feel like official PlayMechi media and announcements, Community should feel like live squad energy, and Profile should feel like player identity and account control.

## Critical Findings

### 1. Arena promises result upload, but the upload UI appears disconnected

File: `apps/android/app/(tabs)/arena.tsx`

The file defines result-upload behavior and submission UI, including `ResultUploadCard`, `MySubmissions`, `uploadMutation`, and submission state. In the main Arena render, the visible flow shows check-in, room, standings, bracket, and prize information, but the upload components are not surfaced as a clear match-day action.

Impact: users may not find the most important post-match action. This is a production-risk UX issue, because disputes and proof submission are core tournament operations.

Recommendation: make Proof a first-class Arena section or tab:

- Check-in
- Room
- Fixtures / Standings
- Upload Proof
- My Submissions

### 2. The app has the right navigation, but not enough screen personality

Tabs:

- Home
- Arena
- Feed
- Community
- Profile

This structure is good. The problem is that the screens visually blend together. Most surfaces use similar cards, similar spacing, and similar bold text. A world-class app needs each tab to have a distinct job and a distinct interaction style.

Target:

- Home: command center
- Arena: match-day operator desk
- Feed: official media and announcements
- Community: live chat and challenges
- Profile: player identity and support

### 3. Visual hierarchy is too flat

Files:

- `apps/android/src/components/ui.tsx`
- `apps/android/src/theme.ts`
- `apps/android/app/(tabs)/index.tsx`
- `apps/android/app/(tabs)/arena.tsx`
- `apps/android/app/(tabs)/profile.tsx`

The shared `Card` component is simple and consistent, but it makes almost every module feel equally important. Home, Arena, and Profile all become long scrolls of white panels.

Recommendation: create a small hierarchy of surfaces:

- Command card: one primary action and live status
- Data strip: compact tournament facts
- Task card: one workflow step
- Feed card: media-first update
- Chat bubble: community conversation
- Settings row: profile and account controls

Cards should keep the current 8px radius discipline, but add better spacing, status accents, and subtle elevation.

### 4. Brand color exists, but the app does not yet feel branded

Brand palette:

- Mechi Electric Teal: `#32E0C4`
- Competitive Coral: `#FF6B6B`
- Night Slate: `#0B1121`
- White: `#FFFFFF`
- Light Neutral Gray: `#E2E8F0`

The palette is strong. Current UI mostly uses light gray, white, and dark slate panels. Teal and coral appear as accents, but not as a confident identity system.

Recommendation:

- Use Night Slate for major live surfaces and headers.
- Use Electric Teal for active status, primary action, check-in, and live confirmations.
- Use Competitive Coral only for urgent states, challenges, warnings, and energetic highlights.
- Keep White and Light Neutral Gray for readability and calm structure.

Avoid turning the whole app teal or dark. The strongest direction is clean light UI with powerful dark match-day surfaces.

### 5. Home should be simpler and more decisive

File: `apps/android/app/(tabs)/index.tsx`

Home currently includes a hero, tournament status, next action, announcements, match desk, community, live pulse, and support. The content is useful, but too much of it competes for attention.

Recommended Home order:

1. Command header: active tournament, player state, countdown, next action.
2. My match status: check-in, room, opponent or bracket, proof status.
3. Announcements: one official update only.
4. Quick actions: Arena, Feed, Community, Support.

The first screen should answer:

- Am I registered?
- What is happening now?
- What should I do next?
- How long do I have?

### 6. Arena needs to become a task-based desk

File: `apps/android/app/(tabs)/arena.tsx`

Arena is the most important screen, but it currently feels like a long operational page. A tournament player should not scroll through everything to find the next step.

Recommended Arena structure:

- Top: selected game and live state
- Segment control: PUBG Mobile, CODM, eFootball
- Match task rail: Register, Check in, Room, Result proof
- Main panel changes based on selected task
- Bottom: support and dispute path

Important improvements:

- Show whether the player is registered for the selected game.
- Hide or reduce web registration prompts when the player is already registered.
- Put room credentials in a copy-friendly layout.
- Make result upload visible before and after the match.
- Keep standings and brackets behind tabs or compact sections.

### 7. Feed is closest to the right direction, but needs polish

Files:

- `apps/android/app/(tabs)/feed.tsx`
- `apps/android/src/components/feed-post-card.tsx`

Feed already has media cards, official updates, metrics, and actions. This is the strongest visual foundation in the app.

Recommended improvements:

- Use `expo-image` for better loading, caching, and placeholders.
- Add an official PlayMechi badge near the author.
- Make the first feed item more compact on repeat visits.
- Add a story/status rail for live tournaments, streams, winners, and clips.
- Improve overlay contrast on media pills and timestamps.
- Use cleaner action labels: React, Share, Watch, Register.

The Feed should feel like official social coverage, not a dashboard.

### 8. Community is too basic for the intended product

File: `apps/android/app/(tabs)/community.tsx`

The intended product is "modern community gaming chat, users can challenge each other." The current screen is closer to a simple message board.

Recommended Community structure:

- Live room header: online count, active tournament, moderation state.
- Chat timeline: grouped messages, avatars, reactions, official markers.
- Challenge chips: "1v1", "Squad up", "Scrim", "Need teammate".
- Sticky composer above the tab bar.
- Message actions: react, reply, challenge.

The goal is not to build Discord fully. The goal is to make the room feel alive and game-native.

### 9. Profile should become player identity, not just account settings

File: `apps/android/app/(tabs)/profile.tsx`

Profile is useful but plain. It should make the player feel recognized.

Recommended Profile structure:

- Player identity card: avatar, username, region, status.
- Game cards: PUBG Mobile, CODM, eFootball, IDs, registrations.
- Notifications: tournament alerts, match reminders, community replies.
- Support: help, dispute, WhatsApp.
- Account: sign out and security.

Settings should be compact rows, not repeated large cards.

### 10. Auth and onboarding need trust polish

Files:

- `apps/android/app/(auth)/login.tsx`
- `apps/android/app/(auth)/register.tsx`
- `apps/android/app/(onboarding)/profile.tsx`

Login and registration are functional but basic. For production, these screens should carry the PlayMechi brand more strongly.

Recommended improvements:

- Use the PlayMechi crest or wordmark.
- Add show/hide password.
- Add forgot password if supported.
- Make errors friendlier and more precise.
- Reduce long chip lists for region/game selection.
- Use a progress indicator during onboarding.

## Design System Direction

### Color Roles

Use the existing brand palette as semantic roles:

- `brandPrimary`: `#32E0C4`
- `brandAccent`: `#FF6B6B`
- `ink`: `#0B1121`
- `surface`: `#FFFFFF`
- `surfaceSoft`: `#F8FAFC`
- `appBackground`: `#E2E8F0`
- `borderSubtle`: `#CBD5E1`
- `success`: teal/green family
- `warning`: amber family
- `danger`: coral/red family

### Type Scale

Current typography uses heavy weights often. Use weight more selectively.

- Display: 28/32, weight 800
- Screen title: 22/28, weight 800
- Section title: 15/20, weight 800
- Body: 14/20, weight 500
- Meta: 12/16, weight 600
- Numbers: tabular numbers for countdowns, scores, positions, and prize amounts

### Component Kit

Build or refine these reusable components:

- `AppHeader`
- `CommandCard`
- `TournamentStatusStrip`
- `GameSegmentControl`
- `MatchTaskCard`
- `RoomCredentialBlock`
- `ProofUploadPanel`
- `FeedPostCard`
- `ChatBubble`
- `ChallengeChip`
- `ProfileHero`
- `SettingsRow`
- `EmptyState`
- `SkeletonBlock`

### Interaction Polish

Add subtle interaction feedback:

- Haptics on primary actions, tab changes, check-in, copy room code, and proof upload.
- Skeleton loading states for tournament data and feed.
- Press states for cards and action rows.
- Animated countdown/status changes.
- Toast confirmations for copied room codes and uploaded proof.

## Recommended Information Architecture

### Home

Purpose: "What is happening and what do I do next?"

Sections:

- Active tournament command card
- Countdown and next action
- My match status
- Official announcement
- Quick actions

### Arena

Purpose: "Run my tournament day."

Sections:

- Game switch
- Player tournament state
- Task tabs: Check-in, Room, Fixtures, Proof
- Standings or bracket
- Support/dispute

### Feed

Purpose: "Official PlayMechi updates and media."

Sections:

- Live/status rail
- Official update cards
- Media cards
- Stream/winner highlights

### Community

Purpose: "Talk, react, squad up, challenge."

Sections:

- Live room state
- Chat timeline
- Challenge prompts
- Sticky composer

### Profile

Purpose: "My player identity and account."

Sections:

- Player hero
- Games and IDs
- Notifications
- Support
- Account

## Full Recommendation Matrix

### App-Wide Recommendations

Priority: P0

Recommendation: create a stronger design system before adding more screens.

Current state: shared UI is consistent, but too generic. The same card treatment is used for dashboard content, forms, chat, tournament status, room credentials, and settings. This makes the app feel basic even when the functionality is useful.

Target state: every surface should communicate its role before the user reads the text.

Build:

- `CommandCard` for the most important action on Home and Arena.
- `TaskCard` for tournament steps.
- `DataRow` and `DataStrip` for fixtures, room codes, stats, and prize amounts.
- `ChatBubble` for Community instead of generic cards.
- `SettingsRow` for Profile instead of large account cards.
- `MediaCard` for Feed.

Acceptance criteria:

- Users can tell the primary action on each screen within 3 seconds.
- No screen has more than one dominant hero-style panel.
- The same visual component is not used for unrelated jobs like chat and account settings.

### Navigation Recommendations

Priority: P1

Recommendation: keep the five tabs, but make each tab's role obvious.

Keep:

- Home
- Arena
- Feed
- Community
- Profile

Improve:

- Home should not duplicate every other tab. It should summarize and route.
- Arena should be the only match-day operational workspace.
- Feed should be official, media-led, and announcement-led.
- Community should be player-to-player.
- Profile should be identity, preferences, support, and account.

Acceptance criteria:

- A new player should know where to register, check in, find room credentials, upload proof, and ask for help without reading instructions.
- The Home screen should never become a long copy of Arena and Feed.

### Home Recommendations

Priority: P0

Current issue: Home has useful information, but it reads like a scroll of modules. The greeting, tournament card, next action, announcements, match desk, social card, live pulse, and support all compete.

Target experience: Home should feel like a control room with one clear next move.

Recommended layout:

1. Top command card:
   - "PlayMechi Weekend Cup"
   - status: Registered / Not registered / Check-in open / Match live
   - countdown
   - one primary action
2. My match strip:
   - game
   - check-in
   - room
   - proof
3. Official announcement:
   - one short update
4. Quick actions:
   - Open Arena
   - View Feed
   - Enter Community
   - Support

Copy direction:

- Replace hype-only text with precise energetic copy.
- Good: "Check-in opens in 18m. Keep your game ID ready."
- Avoid: "Yo player, ready up" as the main screen headline in production.

Acceptance criteria:

- The first viewport answers: registered status, tournament state, next action, countdown.
- No more than four sections appear before the user scrolls.

### Arena Recommendations

Priority: P0

Current issue: Arena contains the right operational pieces, but it is too linear and does not visibly prioritize proof upload. The screen promises result upload, but proof upload should be impossible to miss.

Target experience: Arena should feel like a match-day desk.

Recommended layout:

1. Game segmented control:
   - PUBG Mobile
   - CODM
   - eFootball
2. Player state card:
   - registered/not registered
   - check-in status
   - next task
3. Task tabs:
   - Check-in
   - Room
   - Fixtures
   - Proof
4. Context panel:
   - changes based on selected task
5. Support/dispute row:
   - visible, compact, not dominant

Proof upload recommendation:

- Render proof upload as its own task section.
- Show upload availability by game.
- Show disabled state with reason when proof is not yet allowed.
- Show latest submission status after upload.
- Add copy confirmation for uploaded file name, time, and game.

Room recommendation:

- Room ID and password should be in copy-friendly blocks.
- Use selectable text for all room codes.
- Add a "Copied" toast after copy.
- Make match number, game, and room deadline visible together.

Standings/bracket recommendation:

- Keep detailed standings and bracket below task tabs.
- Use compact rows, not large cards per item.
- Highlight the signed-in player.

Acceptance criteria:

- The user can complete check-in, find room credentials, and upload proof from Arena without scrolling through unrelated content.
- Proof upload and My Submissions are both visible in the main flow.
- Registration prompts are reduced when the user is already registered.

### Feed Recommendations

Priority: P1

Current issue: Feed is visually stronger than the other screens, but it still feels partly like a dashboard. Media handling and official identity can be stronger.

Target experience: Feed should feel like PlayMechi's official social layer.

Recommended layout:

1. Status rail:
   - Live
   - Winners
   - Fixtures
   - Clips
   - Streams
2. Official feed cards:
   - announcement
   - media
   - stream
   - winner
   - registration reminder
3. Action row:
   - React
   - Share
   - Watch
   - Register

Media recommendation:

- Move feed media to `expo-image`.
- Add placeholders and failed-image fallback.
- Improve timestamp and pill contrast on media overlays.
- Add official PlayMechi badge to author metadata.

Copy direction:

- Use short, direct captions.
- Good: "CODM check-in is live. Join Arena before the timer closes."
- Good: "Winner post drops after results are verified."
- Avoid vague motivational text when the user needs instructions.

Acceptance criteria:

- Feed cards look good before images load, after images load, and when images fail.
- Official posts are visually distinct from community content.

### Community Recommendations

Priority: P1

Current issue: Community currently behaves like a message board. The product goal is a gaming social room where users chat, react, and challenge each other.

Target experience: fast, energetic, moderated gaming chat.

Recommended layout:

1. Room header:
   - active room name
   - online count
   - moderation status
2. Challenge rail:
   - "1v1"
   - "Squad up"
   - "Scrim"
   - "Need teammate"
3. Chat timeline:
   - avatar
   - username
   - badge/status
   - message bubble
   - reactions
4. Sticky composer:
   - message input
   - send button
   - optional challenge shortcut

Moderation recommendation:

- Keep community tone energetic but safe.
- Show official/moderator messages differently.
- Add a clear locked/muted room state if chat is disabled.

Acceptance criteria:

- The screen visually reads as chat, not a feed.
- Users can send a message without scrolling back to the composer.
- Challenge actions are present but not overwhelming.

### Profile Recommendations

Priority: P1

Current issue: Profile is useful, but it feels like account admin. It should first make the user feel like a PlayMechi player.

Target experience: player card plus account controls.

Recommended layout:

1. Player hero:
   - avatar/initials
   - username
   - region
   - player status
2. Game identity:
   - PUBG Mobile ID
   - CODM ID
   - eFootball ID
3. Tournament history:
   - registered games
   - latest status
   - proof/submission state
4. Notifications:
   - match reminders
   - results
   - community replies
5. Support and account:
   - help
   - dispute
   - sign out

Acceptance criteria:

- Profile feels personal before it feels administrative.
- Game IDs are easy to read and copy.
- Settings are compact rows, not large repeated cards.

### Auth and Onboarding Recommendations

Priority: P1

Current issue: login, register, and profile setup are functional but plain. This is where trust is formed, so brand and clarity matter.

Target experience: fast, clear, credible sign-in and setup.

Recommended improvements:

- Add PlayMechi logo or crest.
- Add show/hide password.
- Add forgot password if backend flow supports it.
- Use clearer error messages.
- Add onboarding progress.
- Replace long chip groups with cleaner grouped selectors where needed.

Acceptance criteria:

- A first-time player understands why profile details are needed.
- Errors tell the user exactly what to fix.
- The screens feel like PlayMechi, not a default form.

### Copywriting Recommendations

Priority: P0

Voice: professional Gen Z gaming, not childish hype.

Rules:

- Be short.
- Tell the user what changed.
- Tell the user what to do next.
- Use hype only after clarity.
- Avoid vague slogans in operational moments.

Examples:

- Home headline: "Weekend Cup is live."
- Next action: "Check in before 7:45 PM EAT."
- Room: "Room opens after check-in is verified."
- Proof: "Upload your result screenshot within 10 minutes."
- Community: "Squad up, challenge clean, keep it fair."
- Feed: "Official updates, winner posts, streams, and schedule changes."

### Visual Quality Recommendations

Priority: P1

What to improve:

- Reduce oversized text inside cards.
- Use fewer all-bold blocks.
- Make countdowns and scores tabular.
- Use tighter spacing on data-heavy sections.
- Use more visual contrast between active, locked, done, and warning states.
- Avoid long paragraphs inside operational cards.
- Use icon plus label for actions where it helps scanning.

Target feel:

- clean
- competitive
- mobile-native
- fast to scan
- energetic without clutter

### Functional UX Recommendations

Priority: P0

Important flows to validate on a real Android phone:

- Login with correct credentials.
- First-time profile setup.
- Home next-action routing.
- Arena game selection.
- Check-in.
- Room credential visibility.
- Proof upload.
- My submissions.
- Feed media loading.
- Community send message.
- Profile sign out.

These should be tested with a production-style build, not only a dev shell.

## Prioritized Roadmap

### P0: Fix production-risk UX

- Surface result proof upload clearly in Arena.
- Add "My submissions" visibility after upload.
- Simplify Home into one next-action command center.
- Fix Feed media overlay contrast.
- Make room credentials easy to copy and verify.

### P1: Make the app feel designed

- Add semantic color tokens and type scale.
- Create card variants instead of one generic card.
- Redesign Arena as task tabs.
- Redesign Community into real chat layout.
- Redesign Profile into identity-first screen.

### P2: Add world-class polish

- Add haptics.
- Add skeleton loading.
- Add better image loading with `expo-image`.
- Add lightweight animations for status changes.
- Add notification and reminder states.

## Recommended First Sprint

The first implementation sprint should be:

1. Arena proof upload visibility.
2. Home command center redesign.
3. Shared design tokens and component variants.
4. Feed overlay and media loading polish.
5. Community chat shell redesign.

This sequence improves usability immediately while creating the design foundation for the full world-class refresh.

## Definition of Done for the UI Refresh

The refresh should be considered complete only when:

- Home has one obvious next action.
- Arena lets a player complete all match-day tasks without confusion.
- Feed feels like official PlayMechi media, not a dashboard.
- Community feels like a live gaming room.
- Profile feels like player identity first and account settings second.
- Empty, loading, error, locked, and completed states are designed.
- Important data is selectable or copy-friendly.
- The app works cleanly on a real Android phone in a production build.
- The PlayMechi name, colors, and tone feel consistent across every screen.
