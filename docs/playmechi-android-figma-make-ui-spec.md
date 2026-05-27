# PlayMechi Android App Figma Make UI Spec

## Goal

Design a polished, user-friendly PlayMechi Android app for competitive mobile tournament players. The app should feel like a sleek match-day companion: calm when users are browsing, sharp and high-contrast when users are managing live tournament tasks.

The design must prioritize clarity, fast decision-making, low cognitive load, and strong trust. Avoid overcrowding. Every screen should answer:

- What is my current status?
- What do I need to do next?
- Where do I go if I need help?

## Product Context

PlayMechi is a gaming tournament and community app. Players use it to:

- Log in or create a player profile.
- Complete game identity setup.
- See current tournament registration and match status.
- Check in for matches.
- View room credentials.
- Upload result proof.
- Track submissions and standings.
- Read official updates.
- Chat with the community.
- Manage their profile, alerts, and support options.

The app is not a generic esports dashboard. It should feel like a direct operational companion for PlayMechi players.

## Design Personality

Use a modern competitive gaming style, but keep it practical and mature.

- Sleek, organized, and polished.
- High confidence, not chaotic.
- Tactical and match-focused.
- Friendly enough for new players.
- Dense only where useful, never cluttered.

Avoid:

- Overloaded dashboards.
- Too many cards in one viewport.
- Marketing-style hero pages.
- Decorative blobs/orbs.
- Excessive gradients.
- Tiny unreadable labels.
- Many competing CTAs.
- Generic esports neon overload.

## Core HCI Principles

### 1. One Primary Action Per Screen

Every screen should have one obvious main action:

- Login: Enter PlayMechi.
- Register: Create player profile.
- Home: Open match desk or register on web.
- Arena: Complete current match task.
- Proof: Submit proof.
- Community: Send clean callout.
- Profile: Edit profile or manage readiness.

Secondary actions should be visually quieter.

### 2. Status Before Detail

Players should not hunt for their state. Put status near the top:

- Registered / Not registered.
- Check-in open / closed.
- Room locked / released.
- Proof pending / approved / rejected.
- Profile complete / missing game ID.

Use short labels and clear status colors.

### 3. Progressive Disclosure

Do not show every tournament detail at once. Use compact summaries first, then reveal detail in screen sections.

Example for Arena:

1. Game selector.
2. Current task rail.
3. Active room/check-in/proof panel.
4. Supporting standings/rules.
5. Recent submissions.

### 4. Thumb-Friendly Controls

Primary controls must be easy to tap:

- Minimum touch target: 48dp.
- Bottom navigation must be reachable and stable.
- Important buttons should span most of the available width.
- Avoid placing destructive actions near primary actions.

### 5. Error Prevention

For high-stakes tasks like proof upload and check-in:

- Confirm what game/match the user is submitting for.
- Show file requirements before upload.
- Disable submit until required fields are ready.
- Use plain error copy.
- Make rejected proof reasons highly visible.

### 6. Calm Empty States

Empty states should explain what happens next without feeling like errors.

Example:

- “No room yet. Credentials appear here once admins release them.”
- “No submissions yet. Upload proof after your match.”
- “No community messages yet. Start with a clean challenge or lobby request.”

## Visual System

### Color Palette

Use a two-mode system.

Light Utility Mode:

- Background: `#F6F9FF`
- Surface: `#FFFFFF`
- Soft Surface: `#F8FAFC`
- Surface Container: `#EEF4FC`
- Border: `#DDE3EB`
- Text: `#161C22`
- Muted Text: `#3B4A46`
- Faint Text: `#6B7A76`

Competition Mode:

- Night Slate: `#0B1121`
- Night Panel: `#151B2C`
- Night Panel 2: `#1A2233`
- Night Border: `rgba(186, 202, 197, 0.16)`
- Competition Text: `#FFFFFF`
- Competition Muted: `#BACAC5`

Brand Actions:

- Electric Teal: `#32E0C4`
- Teal Dark: `#006B5C`
- Competitive Coral: `#FF6B6B`
- Warning Amber: `#F59E0B`
- Danger Red: `#E5485E`

Color Usage:

- Teal means go, active, approved, registered, next step.
- Coral means urgent, live, rejected, attention, match deadline.
- Night Slate is for Arena and match-critical modules.
- White/light surfaces are for profile, feed, onboarding, and general browsing.

### Typography

Use a clean geometric sans-serif.

Recommended:

- Primary: Hanken Grotesk, Inter, or similar.
- Monospace: JetBrains Mono or similar for room IDs, passwords, timers, match codes.

Type Scale:

- Display: 30px / 36px / 900
- Screen Title: 24-28px / 30-34px / 900
- Section Label: 12px / 16px / 900 / uppercase / letter spacing 1.5-1.8
- Body: 14-16px / 20-24px / 500-700
- Metadata: 12-13px / 16-18px / 700
- Data Code: 20-24px / 28px / 900 / monospace

Do not use negative letter spacing. Keep labels readable.

### Shape

Use restrained, precise rounding:

- Small controls: 4px.
- Cards and panels: 8px.
- Large media panels: 8-12px.
- Pills only for status chips or compact labels.

Avoid very round bubbly UI except for badges.

### Spacing

Use an 8px rhythm:

- XS: 4
- SM: 8
- MD: 12
- LG: 16
- XL: 24
- XXL: 32

Screen padding:

- Mobile horizontal padding: 16px.
- Section gap: 20-24px.
- Card internal padding: 16px.
- Compact card gap: 8-12px.

Use whitespace deliberately. Do not fill every vertical space with a card.

### Containers

Containers should be sleek and purposeful.

Light cards:

- White background.
- 1px cool border.
- 8px radius.
- Minimal or no shadow.

Dark competition cards:

- Night panel background.
- Subtle border.
- Top accent line for live/active panels.
- Optional low-opacity teal/coral glow only for active status.

Avoid cards inside cards unless it is a form field inside a form card or a small data row.

## Navigation

Use a fixed bottom navigation with five tabs:

1. Home
2. Arena
3. Feed
4. Community
5. Profile

Bottom nav design:

- Floating dark container.
- Rounded 24-28px outer radius.
- Teal active icon and label.
- Muted inactive icons.
- Large touch area.
- No crowded extra actions.

Top bar:

- Dark header on all main screens.
- Left: menu icon.
- Center: PlayMechi logo/wordmark.
- Right: notifications icon.
- Keep header height compact but tappable.

## Required Screens

### 1. Splash / Launch

Purpose:

Load the app with trust and brand polish.

Layout:

- Centered logo plate.
- PlayMechi wordmark.
- Short loading label.
- Light background.

Content:

- Logo.
- “PlayMechi”
- “Opening match desk”

HCI:

- Do not show too much.
- Should feel fast and calm.

### 2. Login

Purpose:

Fast return for existing players.

Layout:

- Brand block at top.
- Compact dark command strip explaining app value.
- Login form card.
- Footer link to create profile.

Required elements:

- Logo plate.
- Title: “Back in the lobby”
- Field: Phone, email, or username.
- Field: Password.
- Toggle: Show/hide password.
- Link: Forgot password.
- Primary CTA: Enter PlayMechi.
- Secondary: Create your player profile.

HCI:

- Disable CTA until identifier and password are filled.
- Keep error messages close to the form.
- Use direct copy: “Incorrect password” or “Account not found.”

### 3. Create Player Profile

Purpose:

Onboard new players without overwhelming them.

Layout:

- Intro header.
- Progress rail with 3 steps: Identity, Region, Game ID.
- Form cards grouped by task.

Required sections:

- Player details:
  - Gamer tag.
  - Phone.
  - Email.
  - Password.
- Region:
  - Country chips.
  - Region chips.
- Main game:
  - Game chips.
  - Game ID field.
  - WhatsApp alerts toggle/chips.
- Terms confirmation.
- Primary CTA: Create player profile.

HCI:

- Group related fields.
- Do not show tournament registration and profile creation as the same thing.
- Explain that payments/slots happen on web.

### 4. Profile Completion / Edit Profile

Purpose:

Ensure match admins can identify and contact the player.

Layout:

- Player readiness header.
- Region card.
- Game setup card.
- Match alerts card.
- Save CTA.

Required elements:

- Country and region.
- Main tournament game.
- Exact game ID/IGN.
- WhatsApp number.
- Alerts preference.

HCI:

- If incomplete, make missing fields obvious.
- Save button disabled until required fields are complete.

### 5. Home

Purpose:

Give the player a clear overview and next action.

Layout:

- Welcome row with player name and avatar.
- Dark command card for current event.
- Active match card.
- Announcement panel.
- Quick action grid.
- Compact command center list.

Required elements:

- “Welcome back, [name]”
- Current tournament status.
- Tournament title.
- Prize/game/time summary.
- Registration or match status.
- Main CTA:
  - If not registered: Register on web.
  - If registered: Open match desk.
- Active match summary.
- Announcement teaser.
- Quick actions: Arena, Feed, Community, Support.

HCI:

- The command card should be the visual focus.
- Keep quick actions to four.
- Avoid showing full tournament rules here.

### 6. Arena

Purpose:

Competition mode. This is the match operations screen.

Visual mode:

Dark Night Slate.

Layout:

- Game selector rail.
- Tournament title and live/entered badge.
- Task rail.
- Active task panel.
- Supporting bento cards.
- Proof upload section.
- Recent submissions.

Game selector:

- PUBG Mobile
- CODM
- eFootball
- Free Fire

Task rail:

- Register
- Check-in
- Room
- Fixtures
- Proof

Task panel states:

Register state:

- Shows if player has no entry.
- Primary CTA: Register on web.
- Explain that payment and slot verification are on web.

Check-in state:

- Shows check-in availability.
- Display game, entry username, required fields.
- Primary CTA: Check in.
- Warning if check-in is closed or full.

Room state:

- Shows locked or released room credentials.
- Room ID.
- Password.
- Match number.
- Start time.
- Copy buttons.
- Launch game/community support.

Fixtures state:

- eFootball bracket/fixture list.
- Opponent.
- Status.
- Score if available.

Proof state:

- Upload result screenshot.
- Match selector.
- Evidence upload box.
- Submit proof.

HCI:

- Arena should show only one active task panel at a time.
- Use a task rail to avoid vertical clutter.
- Room credentials must be large and copyable.
- Use monospace for room ID/password.
- Make “Report issue” visible but visually secondary to the main action.

### 7. Submit Result Proof

Purpose:

Let players submit verification evidence without mistakes.

Layout:

- Header: Submit Result Proof.
- Instruction copy.
- Match selector.
- Screenshot evidence upload area.
- Submit CTA.
- Recent submissions list.

Required elements:

- Select match field.
- Upload box:
  - Icon.
  - “Tap to upload image”
  - “PNG, JPG up to 10MB. Must clearly show all player scores.”
- Submit Proof button.
- Recent submissions:
  - Pending.
  - Approved.
  - Rejected with reason.

HCI:

- Do not let users submit without selecting match and image.
- Rejected items should clearly show reason.
- Approved items should feel reassuring, not visually loud.

### 8. Feed

Purpose:

Official PlayMechi updates, announcements, and next actions.

Layout:

- Dark feed intro card.
- Two quick action cards.
- Feed post cards.

Required content:

- Official updates.
- Tournament reminders.
- Stream or social posts.
- Community prompts.
- CTA per post.

Feed post card:

- Author row.
- Official badge.
- Media/image.
- Tags.
- Title.
- Short body.
- Metrics.
- Primary and secondary action buttons.

HCI:

- Feed should not feel like a chaotic social app.
- It is an official update stream.
- Keep post bodies short.
- Use clear action buttons.

### 9. Community

Purpose:

Live player room for clean callouts, squads, support, and match talk.

Layout:

- Dark community hero.
- Challenge prompt chips.
- Message list.
- Composer card.

Required elements:

- Room status: Live Now / Read Only.
- Prompt chips:
  - 1v1?
  - Squad up.
  - Need teammate.
  - Scrim call.
- Message rows:
  - Avatar initials.
  - Sender.
  - Time.
  - Message body.
  - Reply/Challenge mini actions.
- Composer:
  - Text area.
  - Send button.

HCI:

- Keep messages readable.
- Avoid dense Discord-style clutter.
- Make read-only status clear.
- Encourage clean callouts, not spam.

### 10. Profile

Purpose:

Identity, readiness, support, and account controls.

Layout:

- Avatar hero.
- Level/status badge.
- Username.
- Region.
- Edit Profile CTA.
- Profile stat rail.
- Game identities card.
- Tournament stats card.
- Readiness card.
- Menu card.
- My entries card if registered.

Required elements:

- Avatar.
- Level/status.
- Username.
- Region.
- Edit profile.
- Game IDs:
  - PUBG Mobile.
  - CODM.
  - eFootball.
  - Free Fire.
- Stats:
  - Entries.
  - MP/reward points.
- Readiness:
  - Profile completion.
  - Activity level.
  - Reputation.
- Menu:
  - Notifications.
  - Support.
  - Tournament page.
  - Sign out.

HCI:

- Sign out should be separated and coral/red.
- Game IDs should be selectable/copyable.
- Readiness should be informative but not judgmental.

### 11. Legal / Support

Purpose:

Give users confidence and help paths.

Layout:

- Plain light screen.
- Policy link cards.
- Support CTA.

Required:

- Terms.
- Privacy.
- Delete account request.
- Support email / WhatsApp.

HCI:

- Keep this calm and readable.
- No gaming decoration needed.

## Component Library

### Top Bar

Properties:

- Variant: light-context dark header.
- Left icon button.
- Center logo.
- Right notification icon.

Rules:

- Always same height.
- No long page titles in the top bar.
- Use page content for screen titles.

### Bottom Navigation

Properties:

- Dark floating container.
- Five items.
- Icon + uppercase label.
- Active teal.

Rules:

- Must not overlap content.
- Content bottom padding must account for nav height.

### Command Card

Purpose:

Feature the current tournament or next action.

Style:

- Night Slate background.
- 8px radius.
- Thin teal border.
- Strong title.
- Status badge.
- Primary CTA.

Use on:

- Home.
- Register redirect.
- Login strip.

### Status Badge

Tones:

- Registered: teal.
- Open: teal.
- Live: coral.
- Pending: neutral.
- Approved: teal.
- Rejected: coral/red.
- Locked: neutral.

### Game Chip

Style:

- Active: teal background, Night Slate text.
- Inactive on dark: transparent, muted border.
- Inactive on light: white, soft border.

### Task Rail Item

Style:

- Icon square.
- Label below.
- Active icon square teal.
- Inactive dimmed.

Use only in Arena.

### Data Credential Row

For:

- Room ID.
- Password.
- Match code.

Style:

- Dark nested row.
- Monospace large value.
- Copy button on right.

### Upload Box

Style:

- Dashed border.
- Soft surface.
- Large icon tile.
- Clear upload instructions.

### Menu Row

Style:

- Icon left.
- Label and optional helper text.
- Chevron right.
- 62px min height.

## Page Flow

### First-Time User

1. Splash.
2. Login/Register choice.
3. Create Player Profile.
4. Profile Completion if missing required game ID.
5. Home.
6. Register on web.
7. Arena after entry.

### Returning Registered Player

1. Splash.
2. Home.
3. Arena.
4. Check in.
5. View room.
6. Upload proof.
7. Track submission.

### Returning Unregistered Player

1. Splash.
2. Home.
3. Command card says registration open.
4. Register on web.
5. Return to app for match desk.

## Figma Make Prompt

Use this prompt in Figma Make:

```text
Create a complete polished Android app UI for PlayMechi, a competitive mobile gaming tournament companion.

Design style:
- Sleek, modern, organized, and user-friendly.
- Competitive gaming energy without clutter.
- Light utility screens and dark competition-mode Arena screens.
- Use Electric Teal #32E0C4 for active/go/success actions.
- Use Competitive Coral #FF6B6B for urgent/live/rejected states.
- Use Night Slate #0B1121 for dark match-day modules.
- Use white and cool gray surfaces for calm browsing screens.
- Use 8px spacing rhythm, 16px mobile margins, 8px card radius, 4px small control radius.
- No decorative blobs, no excessive gradients, no overcrowded dashboards.
- Use polished containers with subtle borders, clean hierarchy, and clear touch targets.

Create these screens:
1. Splash / Launch
2. Login
3. Create Player Profile
4. Complete/Edit Profile
5. Home
6. Arena
7. Submit Result Proof
8. Feed
9. Community
10. Profile
11. Legal / Support

Use a consistent top bar:
- Dark header
- Menu icon left
- PlayMechi logo/wordmark center
- Notification icon right

Use bottom navigation:
- Floating dark rounded container
- Five tabs: Home, Arena, Feed, Community, Profile
- Active item teal
- Inactive items muted

Home screen:
- Welcome row with player name and avatar
- Dark command card for Weekend Cup Season 1
- Show tournament status, prize/game summary, next action button
- Active match card
- Announcement media panel
- Four quick tiles: Arena, Feed, Community, Support
- Compact command center list

Arena screen:
- Dark Night Slate background
- Game selector chips: PUBG Mobile, CODM, eFootball, Free Fire
- Tournament title and live/entered badge
- Task rail: Register, Check-in, Room, Fixtures, Proof
- Active Match Room Credentials card with Room ID, Password, copy buttons, countdown/status, Report Issue, Launch Game
- Bento cards for Current Standings and Match Rules
- Keep content focused and not overcrowded

Submit Proof screen:
- Light screen
- Title: Submit Result Proof
- Match selector
- Screenshot upload dashed box
- Submit Proof button
- Recent submissions list with Pending, Approved, Rejected

Feed screen:
- Official updates, not a noisy social feed
- Dark intro card
- Quick actions
- Feed post cards with media, tags, title, metrics, and CTA buttons

Community screen:
- Live room hero
- Prompt chips: 1v1?, Squad up, Need teammate, Scrim call
- Readable message list
- Composer card

Profile screen:
- Avatar hero with level badge
- Username, region, edit profile button
- Game identities card
- Tournament stats card
- Readiness card
- Menu rows for notifications, support, tournament page, sign out

Prioritize HCI:
- One primary action per screen
- Status before detail
- Progressive disclosure
- Thumb-friendly controls
- Clear empty/error states
- Avoid crowding
- Make every screen answer: what is my status, what do I do next, where do I get help?
```

## Figma Make Screen Notes

When generating, create mobile Android frames at:

- Width: 390px.
- Height: 844px.
- Safe area included.
- Bottom nav included on main authenticated screens.
- Use repeated components where possible.

Frame names:

- `00 Splash`
- `01 Login`
- `02 Create Player Profile`
- `03 Complete Profile`
- `04 Home`
- `05 Arena - Room`
- `06 Arena - Check In`
- `07 Submit Proof`
- `08 Feed`
- `09 Community`
- `10 Profile`
- `11 Legal Support`

## Acceptance Checklist

The design is successful if:

- A new player can understand registration vs profile setup.
- A registered player can find room credentials in under 5 seconds.
- Proof upload requirements are obvious before submission.
- Arena feels like competition mode.
- Home is calm and useful, not crowded.
- Bottom navigation never overlaps important controls.
- Every primary button has enough contrast and clear copy.
- Text fits inside all containers on a 390px mobile frame.
- No screen depends on decorative filler.
- The full app feels like one coherent PlayMechi product.
