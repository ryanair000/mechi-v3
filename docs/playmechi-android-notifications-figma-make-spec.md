# PlayMechi Android Notifications, Toasts, and Updates Figma Make Spec

## Goal

Design the full notification, toast, and update experience for the PlayMechi Android app. The system must help players act quickly on important tournament events without feeling spammed, startled, or overwhelmed.

Every alert surface should answer:

- What happened?
- Is it urgent?
- What should I do next?
- Where will tapping this take me?
- Can I safely ignore this?

The design must support push notifications, in-app notification inbox, unread indicators, notification settings, permission states, WhatsApp alert states, in-app toasts, live update banners, app update notices, maintenance notices, and all major PlayMechi tournament/community/support situations.

## Product Context

PlayMechi players rely on alerts for high-stakes actions:

- Match rooms released.
- Check-in opening or closing.
- Room ID/password changing.
- Proof upload accepted/rejected.
- Tournament registration verified.
- Match or challenge updates.
- Community announcements.
- Support replies.
- App maintenance and version updates.
- Account/profile issues.

Missing an important alert can cost a player their slot, room entry, proof approval, or prize eligibility. The notification UX must be clear, respectful, and action-oriented.

## Core HCI Principles

### 1. Urgency Must Be Visible

Use visual priority:

- Critical: coral/red, strong icon, clear action.
- Action needed: teal/coral badge, primary CTA.
- Informational: neutral surface, softer icon.
- Success: teal confirmation.
- Live update: compact banner or chip, not a full interruption unless urgent.

### 2. Notifications Are Tasks, Toasts Are Feedback

Notifications should route users to a meaningful destination:

- Arena for match tasks.
- Proof page for submissions.
- Community for messages.
- Feed for announcements.
- Profile/settings for account alerts.
- Support for help replies.

Toasts should confirm lightweight app feedback:

- Copied.
- Saved.
- Sent.
- Uploaded.
- Marked read.
- Retry succeeded.

Do not use a toast as the only alert for high-stakes match events.

### 3. Respect Attention

Do not make every alert look urgent.

Only urgent alerts should use strong coral treatment:

- Check-in closing soon.
- Room released.
- Match starting.
- Proof rejected.
- Match disputed.
- Support/action required.
- Required app update.
- Event cancelled.

### 4. Group Related Alerts

Avoid long repetitive lists.

If multiple alerts belong to the same match or event, show:

- Latest update first.
- Related count.
- Compact context line.

Example:

`PUBG Mobile Lobby B - 3 updates`

### 5. Never Hide User Control

Users must always understand:

- Push alerts on/off.
- WhatsApp alerts on/off.
- Android permission blocked vs ready.
- Which alert categories are enabled.
- Whether live updates are automatic or waiting for refresh.
- Whether app update is optional or required.

## Visual System

Use the PlayMechi visual system:

- Light utility screens for inbox/settings.
- Dark competition modules for match-critical previews.
- Electric Teal `#32E0C4` for enabled, success, active, registered, and go actions.
- Competitive Coral `#FF6B6B` for urgent, live, rejected, action required, and required updates.
- Night Slate `#0B1121` for match-day cards and push previews.
- Cool white/gray surfaces for calm lists.
- 16px screen margins.
- 8px card radius.
- 4px small control radius.
- 48dp minimum touch targets.

## Priority Colors

Critical:

- Accent: `#FF6B6B`
- Soft background: `rgba(255,107,107,0.12)`
- Border: `rgba(255,107,107,0.32)`

Action Needed:

- Accent: `#32E0C4`
- Soft background: `rgba(50,224,196,0.12)`
- Border: `rgba(50,224,196,0.28)`

Info:

- Accent: `#6B7A76`
- Background: `#FFFFFF`
- Border: `#DDE3EB`

Success:

- Accent: `#32E0C4`
- Background: `rgba(50,224,196,0.12)`

Warning:

- Accent: `#F59E0B`
- Background: `rgba(245,158,11,0.12)`

Live Update:

- Accent: `#32E0C4`
- Background: `#EFFFFB`
- Border: `rgba(50,224,196,0.24)`

Offline/Sync:

- Accent: `#6B7A76`
- Background: `#F5F7FA`
- Border: `#DDE3EB`

## Alert Surface Rules

Use the right surface for the right job.

Push notification:

- User is outside the app.
- Match/tournament/support/account alert needs attention.
- Route to the exact relevant app area.

Notification inbox row:

- Persistent history.
- All alerts that users may need to revisit.
- Include destination hint.

Critical bottom sheet:

- User is inside the app and an urgent task needs focused action.
- Use for room release, check-in closing, proof rejected, support waiting, match disputed.

Toast:

- Lightweight confirmation after user action.
- Do not use for critical tournament state changes.

Live update banner/chip:

- Data changed while the user is on the screen.
- Let users refresh/open without interrupting their current task.

App update notice:

- App version, maintenance, rules, or system availability changed.
- Required update can block; optional update must not block.

## Notification Types To Design

### Tournament Registration

Situations:

- Registration submitted.
- Payment pending.
- Payment verified.
- Registration rejected or needs correction.
- Tournament registration full.
- Waitlist or slot opened.

Design treatment:

- Submitted: neutral/teal.
- Payment pending: warning.
- Verified: success teal.
- Rejected/correction needed: coral.
- Slot opened: teal action.

Example cards:

- `Registration received`
  - Body: `Your PUBG Mobile entry is waiting for payment confirmation.`
  - CTA: `View entry`

- `Entry verified`
  - Body: `You're confirmed for Weekend Cup Season 1.`
  - CTA: `Open Arena`

- `Fix your entry`
  - Body: `Your game ID needs correction before check-in.`
  - CTA: `Update profile`

### Check-In

Situations:

- Check-in opens.
- Check-in closing soon.
- Check-in successful.
- Check-in failed.
- Check-in full.
- Missed check-in.

Design treatment:

- Opens: teal action.
- Closing soon: coral urgent.
- Success: teal.
- Failed/full/missed: coral or warning.

Example:

- `Check-in is open`
  - Body: `PUBG Mobile check-in is live. Confirm your slot now.`
  - CTA: `Check in`

- `Check-in closes soon`
  - Body: `5 minutes left to secure your lobby slot.`
  - CTA: `Check in now`

### Room Credentials

Situations:

- Room released.
- Room changed.
- Password updated.
- Match delayed.
- Room credentials locked.
- Lobby assignment changed.

Design treatment:

- Room released: critical/action needed, dark card preview.
- Password updated: coral warning.
- Match delayed: warning/info.
- Room locked: neutral.

Example:

- `Room is live`
  - Body: `PUBG Mobile Lobby B credentials are ready.`
  - CTA: `Open room`

Include preview fields when possible:

- Game.
- Lobby number.
- Match number.
- Starts in.
- Room ID hidden or partially shown in notification list for privacy.

### Match Start / Tournament Start

Situations:

- Tournament starts soon.
- Match starts soon.
- Match live.
- Fixture assigned.
- Opponent ready.
- Bracket updated.

Design treatment:

- Match starts soon/live: coral.
- Fixture assigned: teal/info.
- Bracket update: neutral.

Example:

- `Match starts in 10`
  - Body: `Open Arena for room details and proof instructions.`
  - CTA: `Open Arena`

### Proof Upload

Situations:

- Proof needed.
- Proof submitted.
- Proof approved.
- Proof rejected.
- Proof needs clearer screenshot.
- OCR scan pending.
- Admin review pending.

Design treatment:

- Needed: teal action.
- Submitted/review pending: neutral.
- Approved: success teal.
- Rejected/unclear: coral.

Example:

- `Upload result proof`
  - Body: `Submit your post-match screenshot for PUBG Mobile Match 2.`
  - CTA: `Submit proof`

- `Proof rejected`
  - Body: `Screenshot is blurry. Upload a clearer image before review closes.`
  - CTA: `Upload again`

### Payout / Prize

Situations:

- Prize eligibility confirmed.
- Prize pending review.
- Payout approved.
- Payout paid.
- Payout failed.
- Ineligible reason.

Design treatment:

- Confirmed/paid: teal.
- Pending: neutral/warning.
- Failed/ineligible: coral.

Example:

- `Prize status updated`
  - Body: `Your CODM reward is approved and waiting payout.`
  - CTA: `View status`

### Community

Situations:

- Community announcement.
- Player replied to you.
- Moderator pinned message.
- Room locked/unlocked.
- Player challenge message.
- Support-style community update.

Design treatment:

- Official announcement: teal/official badge.
- Reply: neutral/action.
- Moderator action: info.
- Lock/unlock: warning/info.

Example:

- `Official community update`
  - Body: `Weekend Cup room instructions have been pinned.`
  - CTA: `Open community`

### Challenges / 1v1

Situations:

- Challenge received.
- Challenge sent.
- Challenge accepted.
- Challenge declined.
- Challenge cancelled.
- Challenge expired.
- Match found.
- Match completed.
- Match disputed.
- Match chat message.

Design treatment:

- Received/accepted/match found: teal action.
- Declined/cancelled/expired: neutral.
- Disputed: coral.
- Chat message: neutral/action.

Example:

- `Challenge received`
  - Body: `PlayerOne wants a CODM 1v1.`
  - CTA: `Respond`

- `Match disputed`
  - Body: `Admin review is needed for your match result.`
  - CTA: `Open match`

### Account / Profile

Situations:

- Push alerts ready to enable.
- Push alerts blocked in Android settings.
- WhatsApp alerts on/off.
- Profile missing game ID.
- Session expired.
- Account warning.
- Banned/suspended account.

Design treatment:

- Setup needed: warning.
- Blocked: coral but calm.
- Enabled: teal.
- Account warning/suspension: coral.

Example:

- `Game ID missing`
  - Body: `Complete your profile before match check-in.`
  - CTA: `Complete profile`

### Support

Situations:

- Support reply received.
- Support thread waiting for you.
- Support resolved.
- WhatsApp/Instagram support handoff.
- Admin needs more details.

Design treatment:

- Waiting for you: coral/action.
- Reply received: teal/info.
- Resolved: neutral/success.

Example:

- `Support replied`
  - Body: `Admin asked for your room screenshot.`
  - CTA: `Open support`

### System / Maintenance

Situations:

- App update available.
- App update required.
- Tournament schedule changed.
- Event delayed.
- Event cancelled.
- Server issue.
- Rules updated.
- Maintenance scheduled.
- Maintenance complete.

Design treatment:

- Schedule changed: warning.
- Cancelled/server issue: coral.
- Rules update: info.
- Optional app update: teal/info.
- Required app update: coral with blocking action.
- Maintenance: warning/info depending on severity.

## Toast System

Toasts are lightweight feedback for actions the user just performed. They should not replace important notifications.

### Toast Placement

Default:

- Bottom floating toast, above bottom tabs.
- 16px horizontal margin.
- Do not cover primary CTAs, text inputs, room credentials, or proof upload controls.

Auth/onboarding:

- Top toast below header if bottom area contains form actions.

Arena critical mode:

- Prefer top banner for critical match updates.
- Use bottom toast only for copied/saved feedback.

### Toast Anatomy

Each toast may include:

- Icon.
- Short title.
- Optional one-line detail.
- Optional action.
- Optional dismiss icon.

Keep text concise:

- Title max 32 characters.
- Detail max 64 characters.
- One action max.

### Toast Durations

- Success: 2.5-3.5 seconds.
- Info: 3 seconds.
- Warning: 4 seconds.
- Error: 6 seconds or until dismissed.
- Undo: 6 seconds.
- Match-critical toast: avoid if possible; use banner/bottom sheet instead.

### Toast Variants

Success:

- Use for completed action.
- Teal icon and subtle teal background.
- Examples:
  - `Profile updated`
  - `Proof selected`
  - `Settings saved`
  - `Marked all read`

Info:

- Use for neutral feedback.
- Examples:
  - `Filter changed`
  - `Copied room ID`
  - `Copied password`
  - `Invite copied`

Warning:

- Use for recoverable issue.
- Examples:
  - `Upload paused`
  - `Weak connection`
  - `Room refresh delayed`

Error:

- Use when user action failed.
- Include retry if useful.
- Examples:
  - `Upload failed`
  - `Could not save settings`
  - `Message not sent`

Undo:

- Use when action can be reversed.
- Examples:
  - `Notification archived` with `Undo`
  - `Message deleted` with `Undo`

### Toast Anti-Patterns

Do not:

- Stack more than one toast at once.
- Use toasts for check-in closing, room release, proof rejection, or required update.
- Cover bottom navigation.
- Hide form validation behind a toast only.
- Put long explanations inside a toast.

## Live Update System

Live updates show that data changed while the user is already inside the app. They should be calm, visible, and easy to act on.

### Live Update Use Cases

Arena:

- Room credentials refreshed.
- Match status changed.
- Check-in count changed.
- Proof review status changed.
- Lobby assignment changed.

Community:

- New messages.
- Pinned message changed.
- Moderator announcement.
- Room instructions updated.

Feed:

- New official post.
- Tournament update added.
- Rules post updated.

Profile/settings:

- Push permission status changed after returning from Android settings.
- WhatsApp alert status synced.
- App version check completed.

### Live Update Variants

Fresh Data:

- Use when screen content updated automatically.
- Copy: `Updated just now`
- Treatment: small teal status chip.

New Items:

- Use when new content is available but not inserted yet.
- Copy: `3 new community messages`
- CTA: `Show`
- Treatment: centered pill above list.

Urgent Change:

- Use when current screen changed in a way that affects action.
- Copy: `Room password changed`
- CTA: `View`
- Treatment: coral or warning top banner.

Offline:

- Use when realtime updates are unavailable.
- Copy: `You're offline. Showing last saved info.`
- Treatment: neutral/warning banner.

Syncing:

- Use when refreshing state.
- Copy: `Syncing latest match info`
- Treatment: slim neutral progress row.

Connection Restored:

- Use after offline state resolves.
- Copy: `Back online. Latest updates loaded.`
- Treatment: teal toast or chip.

### Live Update Placement

Arena:

- Directly above active match panel.
- Never cover room ID/password.

Community:

- New message chip above message list.
- Official announcement banner below screen header.

Feed:

- New posts chip above feed list.

Profile:

- Status row inside relevant settings card.

Home:

- Compact banner inside the current tournament command area.

## App and Product Update Notices

App and product updates tell users about app version changes, maintenance, rules, and platform availability.

### Optional App Update

Use when the app can still run.

Layout:

- Inline banner or settings card.
- Teal/info treatment.
- CTA: `Update app`
- Secondary: `Later`

Copy:

- Title: `Update available`
- Body: `A newer PlayMechi version is ready with fixes and smoother match alerts.`

### Required App Update

Use when the current app version cannot safely continue.

Layout:

- Blocking full-screen state or modal.
- Coral priority.
- Clear reason.
- One primary CTA.

Copy:

- Title: `Update required`
- Body: `This version can no longer join live matches. Update PlayMechi to continue.`
- CTA: `Update app`

HCI:

- Do not include a confusing dismiss action if app cannot continue.
- If store link fails, provide secondary `Contact support`.

### Feature Update / What's New

Use after app update or product release.

Layout:

- Polished card in inbox or profile.
- 2-3 concise bullets.
- CTA: `Try it`
- Secondary: `Not now`

Copy:

- Title: `New match alerts`
- Body: `Room changes and proof reviews are easier to track during live tournaments.`

### Maintenance Scheduled

Use before planned downtime.

Layout:

- Warning banner.
- Include date/time in EAT.
- CTA: `View details`

Copy:

- Title: `Maintenance scheduled`
- Body: `PlayMechi may be unavailable tonight from 11:00 PM to 11:30 PM EAT.`

### Maintenance Complete

Use after recovery.

Layout:

- Success/info toast or inbox row.
- CTA optional.

Copy:

- Title: `Maintenance complete`
- Body: `PlayMechi is back online.`

### Rules / Policy Update

Use when tournament rules or eligibility changed.

Layout:

- Info notification row.
- Optional bottom sheet if user must acknowledge.
- CTA: `Read rules`

Copy:

- Title: `Rules updated`
- Body: `Weekend Cup proof and payout rules have been updated.`

## Required Screens

### 1. Notification Permission Prompt

Purpose:

Ask users to enable push alerts with clear value.

Layout:

- Light background.
- Dark compact preview card showing sample match alert.
- Explanation of why alerts matter.
- Primary CTA: `Enable push alerts`.
- Secondary CTA: `Not now`.

Content:

- Title: `Stay ready for match day`
- Body: `Get room releases, check-in reminders, proof review, and support replies before you miss a slot.`
- Bullet benefits:
  - Room codes when released.
  - Check-in reminders.
  - Proof approval/rejection.
  - Support replies.

HCI:

- Ask after login/profile setup, not before users understand the app.
- Do not guilt users.
- Mention that WhatsApp alerts are separate.

### 2. Permission Blocked State

Purpose:

Tell user Android blocked alerts and how to fix it.

Layout:

- Warning/coral icon.
- Clear status card.
- Steps list.
- CTA: `Open Android settings`.
- Secondary: `Keep using app`.

Copy:

- Title: `Push alerts are blocked`
- Body: `Android settings are preventing PlayMechi alerts.`
- Steps:
  - Open app notification settings.
  - Allow notifications.
  - Return to PlayMechi.

### 3. Notification Inbox

Purpose:

Single organized list of all alerts.

Layout:

- Top bar.
- Header card:
  - `Notifications`.
  - Unread count / all caught up state.
  - Mark all read action.
- Filter chips:
  - All.
  - Match.
  - Tournament.
  - Proof.
  - Community.
  - Support.
  - Account.
- Notification list grouped by date:
  - Today.
  - Yesterday.
  - Earlier.

Notification row structure:

- Priority icon/status dot.
- Category chip.
- Title.
- Body preview.
- Time.
- Destination hint.
- Unread indicator.

HCI:

- Rows should be 72-96px tall depending on body length.
- Limit body preview to 2 lines.
- Unread should be obvious but not noisy.
- Tap row opens the relevant app area.

### 4. Empty Inbox

Purpose:

Make no notifications feel normal.

Layout:

- Bell icon.
- Title.
- Body.
- Optional `Open Arena` CTA.

Copy:

- Title: `No alerts yet`
- Body: `Match, room, proof, community, and support updates will appear here.`

### 5. Critical Notification Detail / Bottom Sheet

Purpose:

Show urgent match information without forcing users to parse the full Arena screen.

Use for:

- Room released.
- Check-in closing soon.
- Proof rejected.
- Support action required.

Layout:

- Bottom sheet or modal.
- Priority badge.
- Title.
- Short body.
- Key details.
- Primary CTA.
- Secondary CTA.

Example details for room released:

- Game: PUBG Mobile.
- Lobby: B.
- Starts: 8:00 PM EAT.
- Status: Room released.

Primary CTA:

- `Open Arena`.

Secondary:

- `Dismiss`.

### 6. Notification Settings

Purpose:

Let users control what they receive.

Layout:

- Header: `Alert settings`.
- Delivery status card.
- Delivery methods section.
- Alert categories section.
- Quiet mode section.

Delivery methods:

- Push alerts.
- WhatsApp alerts.

Delivery status states:

- Push on.
- Push ready to enable.
- Push blocked.
- Android app only.
- Web preview only.
- WhatsApp on.
- WhatsApp missing number.
- WhatsApp off.

Alert categories:

- Match operations.
- Check-in reminders.
- Room credentials.
- Proof review.
- Community announcements.
- Support replies.
- Account/security.
- Marketing/social updates.

Use switches/toggles, not text buttons.

HCI:

- Critical match operations should be recommended on.
- Marketing/social updates should be optional.
- Use helper text below each category.

### 7. Toast System Variants

Purpose:

Define all lightweight feedback messages used across the app.

Layout:

- Show a toast stack preview with one visible toast at a time.
- Include bottom placement above tabs.
- Include top placement for forms/auth.
- Include success, info, warning, error, undo, and copied variants.

Required examples:

- `Copied room ID`
- `Copied password`
- `Proof selected`
- `Settings saved`
- `Message sent`
- `Upload failed`
- `Notification archived` with `Undo`
- `Back online`

### 8. Live Update Banner Variants

Purpose:

Show state changes while users are inside active screens.

Layout:

- Arena top banner.
- Community new messages chip.
- Feed new posts chip.
- Offline/syncing strip.
- Connection restored toast/chip.

Required examples:

- `Room password changed`
- `3 new community messages`
- `New tournament update`
- `Syncing latest match info`
- `You're offline. Showing last saved info.`
- `Back online. Latest updates loaded.`

### 9. App and Product Update Notices

Purpose:

Show version, feature, maintenance, and rules updates.

Required variants:

- Optional app update banner.
- Required app update blocking screen.
- What's new card.
- Maintenance scheduled banner.
- Maintenance complete success notice.
- Rules updated inbox row.

### 10. Notification Badge States

Design:

- Bell icon with badge count.
- Count 1-9 visible.
- `9+` for more than 9.
- Small coral dot if count unknown.
- No badge if all read.

Use:

- Top bar notification icon.
- Profile notification row.
- Inbox header.

## Notification Routing Rules

Design destination hint in each row:

- `Open Arena` for match, tournament, room, check-in, proof, payout.
- `Open Community` for community messages and announcements.
- `Open Feed` for official updates.
- `Open Profile` for profile/account/push settings.
- `Open Support` for support replies.
- `Open Match` for 1v1/challenge/match chat.
- `Update App` for version notices.
- `Read Rules` for policy/rules updates.

The UI should make the destination clear before tap.

## Priority Matrix

Critical:

- Room released.
- Room password changed.
- Check-in closing soon.
- Match starting soon.
- Proof rejected.
- Match disputed.
- Support waiting for user.
- Event cancelled.
- Required app update.

Action Needed:

- Check-in open.
- Proof needed.
- Registration needs correction.
- Challenge received.
- Game ID missing.
- Push blocked.
- Optional app update.

Success:

- Registration verified.
- Check-in successful.
- Proof approved.
- Payout paid.
- Challenge accepted.
- Settings saved.
- Maintenance complete.

Info:

- Community announcement.
- Feed update.
- Rules updated.
- Match delayed.
- Support resolved.
- New app feature.

Live:

- New messages.
- New posts.
- Data refreshed.
- Syncing.
- Connection restored.

## Screen Content Examples

### Critical Room Release Row

Title:

`Room is live`

Body:

`PUBG Mobile Lobby B credentials are ready. Match starts at 8:00 PM.`

Metadata:

`Arena - 2 min ago`

CTA hint:

`Open Arena`

### Check-In Reminder Row

Title:

`Check-in closes soon`

Body:

`5 minutes left to confirm your Weekend Cup slot.`

Metadata:

`Tournament - Now`

CTA hint:

`Check in`

### Proof Rejected Row

Title:

`Proof rejected`

Body:

`Screenshot is blurry. Upload a clearer image before review closes.`

Metadata:

`Proof - 12 min ago`

CTA hint:

`Upload again`

### Toast Success Example

Title:

`Copied room ID`

Body:

`Paste it into PUBG Mobile.`

Placement:

Bottom, above tabs.

### Live Update Example

Title:

`Room password changed`

Body:

`Open Arena for the latest credentials.`

CTA:

`View`

Placement:

Arena top banner.

### Required Update Example

Title:

`Update required`

Body:

`This version can no longer join live matches. Update PlayMechi to continue.`

CTA:

`Update app`

## Figma Make Prompt

Use this prompt in Figma Make:

```text
Create a complete notifications, toasts, and updates UX for the PlayMechi Android app.

Product:
PlayMechi is a competitive mobile gaming tournament companion. Players need alerts for tournament registration, check-in, room credentials, match start, proof upload, proof approval/rejection, community announcements, support replies, challenge/match updates, payouts, account/profile issues, live data changes, app updates, maintenance, and rules changes.

Design style:
- Sleek, polished, mobile-first Android UI.
- Light utility screens for inbox/settings.
- Dark Night Slate competition cards for urgent match alerts.
- Electric Teal #32E0C4 for enabled, success, active, and go actions.
- Competitive Coral #FF6B6B for urgent, rejected, live, required update, and action-required states.
- Night Slate #0B1121 for match-critical notification previews.
- Cool white/gray surfaces for calm lists.
- 16px screen margins, 8px card radius, 4px small control radius, 48dp minimum touch targets.
- No overcrowding, no decorative blobs, no generic esports clutter.

Create these Android mobile screens:
1. Push Permission Prompt
2. Push Permission Blocked State
3. Notification Inbox - Mixed Alerts
4. Notification Inbox - Empty
5. Critical Notification Detail Bottom Sheet - Room Released
6. Critical Notification Detail Bottom Sheet - Proof Rejected
7. Notification Settings
8. Toast System Variants
9. Live Update Banner Variants
10. App and Product Update Notices
11. Notification Badge States

Notification Inbox requirements:
- Top dark PlayMechi header with bell icon badge.
- Header card with title "Notifications", unread count, and "Mark all read".
- Filter chips: All, Match, Tournament, Proof, Community, Support, Account.
- Group list by Today, Yesterday, Earlier.
- Notification rows with icon/status dot, category chip, title, 2-line body preview, time, unread indicator, and destination hint.
- Use different row tones for Critical, Action Needed, Success, Info, and Live.

Design all key notification situations:
- Registration received
- Payment pending
- Entry verified
- Entry needs correction
- Check-in open
- Check-in closing soon
- Check-in successful
- Room released
- Room/password changed
- Match starts soon
- Proof needed
- Proof submitted
- Proof approved
- Proof rejected
- Prize/payout updated
- Community announcement
- Reply/message received
- Challenge received/accepted/declined
- Match disputed
- Support replied
- Profile/game ID missing
- Push alerts blocked
- WhatsApp alerts off/missing number
- Event delayed/cancelled
- Rules updated
- Optional app update
- Required app update
- Maintenance scheduled/complete

Toast system requirements:
- Toasts are lightweight feedback, not navigation.
- Show bottom toast placement above bottom tabs and top placement for forms/auth.
- Include success, info, warning, error, undo, copied, and connection restored variants.
- Example toast copy: "Copied room ID", "Copied password", "Proof selected", "Settings saved", "Message sent", "Upload failed", "Notification archived", "Back online".
- Include icon, short title, optional one-line detail, optional action, optional dismiss.
- Never cover bottom navigation, room credentials, proof upload controls, or primary form buttons.
- Do not use toast as the only surface for room release, check-in closing, proof rejection, match dispute, or required update.

Live update requirements:
- Create Arena top banners for room/password changes and match state changes.
- Create Community and Feed new item chips.
- Create offline, syncing, refreshed, and connection restored states.
- Example copy: "Room password changed", "3 new community messages", "New tournament update", "Syncing latest match info", "You're offline. Showing last saved info.", "Back online. Latest updates loaded."
- Live updates should be visible but not interrupt the user's current task unless urgent.

App/product update requirements:
- Optional app update inline banner with "Update app" and "Later".
- Required app update blocking screen with one primary "Update app" action and optional "Contact support".
- What's new card with 2-3 concise bullets.
- Maintenance scheduled warning banner with exact EAT time.
- Maintenance complete success/info notice.
- Rules updated notification row with "Read rules".

Critical detail bottom sheet:
- Use for room released, check-in closing soon, proof rejected, support action required.
- Include priority badge, concise title, body, key details, primary CTA, secondary dismiss.
- Example primary CTA: Open Arena, Check in now, Upload again, Open support.

Notification Settings:
- Delivery status card.
- Push alerts toggle with states: on, ready to enable, blocked in Android settings.
- WhatsApp alerts toggle with states: on, off, missing number.
- Category toggles: Match operations, Check-in reminders, Room credentials, Proof review, Community announcements, Support replies, Account/security, Marketing/social updates.
- Critical match operations should appear recommended.

HCI goals:
- One obvious action per alert.
- Urgency visible without making everything urgent.
- Toasts confirm lightweight actions only.
- Live updates show fresh data without disrupting active tasks.
- Users always know what happened and where tapping goes.
- Empty state feels calm.
- Blocked permission state provides clear recovery steps.
- No list row should feel cramped on a 390px mobile frame.
```

## Frame List

Create Android mobile frames at 390px wide:

- `N01 Permission Prompt`
- `N02 Permission Blocked`
- `N03 Notifications Inbox - Mixed`
- `N04 Notifications Inbox - Empty`
- `N05 Critical Detail - Room Released`
- `N06 Critical Detail - Proof Rejected`
- `N07 Notification Settings`
- `N08 Toast Variants`
- `N09 Live Update Banners`
- `N10 App Update Notices`
- `N11 Badge States`

## Component Inventory

### Notification Row

Variants:

- Critical unread.
- Critical read.
- Action unread.
- Success read.
- Info read.
- Live update.
- Disabled/system.

Fields:

- Icon.
- Category.
- Title.
- Body.
- Time.
- Destination hint.
- Unread dot.

### Category Chip

Categories:

- Match.
- Tournament.
- Proof.
- Community.
- Support.
- Account.
- System.
- Update.

### Permission Status Card

States:

- Push on.
- Ready to enable.
- Blocked.
- Android only.
- Web preview.

### Delivery Method Row

Rows:

- Push alerts.
- WhatsApp alerts.

### Alert Category Toggle

Rows:

- Match operations.
- Check-in reminders.
- Room credentials.
- Proof review.
- Community announcements.
- Support replies.
- Account/security.
- Marketing/social.

### Toast Banner

Variants:

- Success.
- Info.
- Warning.
- Error.
- Undo.
- Copied.
- Connection restored.

States:

- Default.
- With detail.
- With action.
- With dismiss.

### Live Update Banner

Variants:

- Fresh data chip.
- New items chip.
- Urgent change banner.
- Offline strip.
- Syncing strip.
- Connection restored chip.

### App Update Notice

Variants:

- Optional update banner.
- Required update full-screen/modal.
- What's new card.
- Maintenance scheduled banner.
- Maintenance complete notice.
- Rules updated row.

### Badge

Variants:

- Dot.
- Count 1-9.
- `9+`.
- Hidden.
- Disabled.

## Acceptance Checklist

The notification, toast, and update design is successful if:

- A user can distinguish urgent vs informational alerts instantly.
- A room release notification clearly leads to Arena.
- Proof rejection tells the user exactly what to fix.
- Push permission blocked state is understandable without technical language.
- Notification settings make push vs WhatsApp alerts clear.
- The inbox remains readable with many notification types.
- Unread states are visible but not noisy.
- Critical alerts use coral sparingly.
- Toasts are short, useful, and never used as the only critical alert.
- Toasts do not cover bottom navigation, form CTAs, proof upload controls, or room credentials.
- Live update banners make fresh data visible without interrupting the user.
- Offline/syncing states are calm and clear.
- Optional vs required app updates are visually distinct.
- Maintenance and rules updates include the right level of detail.
- All rows and banners fit cleanly on a 390px mobile frame.
- The design feels like PlayMechi, not a generic notification center.
