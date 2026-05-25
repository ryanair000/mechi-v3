# PlayMechi Android UI Refresh and Release Plan

Date: 2026-05-25

Owner goal: ship a neater, more organized, world-class PlayMechi Android production build to Google Play.

## Release Principles

- Protect production tournament flows first.
- Improve clarity before adding decoration.
- Make every screen answer the player's next question.
- Keep the five-tab structure: Home, Arena, Feed, Community, Profile.
- Build and test with production-style artifacts before store submission.
- Pause before final Google Play submission because it is public-facing.

## Scope for This Release

This release should focus on P0 and light P1 foundations.

### Included

- Home command-center redesign.
- Arena proof upload visibility.
- Arena player-state and task clarity.
- Feed contrast and official identity polish.
- Community chat shell improvement.
- Shared theme/component polish.
- Typecheck and Android production build.
- Google Play production submission preparation.

### Deferred

- Full real-time reactions.
- Full Discord-style community tooling.
- Full tournament history.
- Advanced animations.
- Major navigation restructure.
- Backend schema changes.

## Step-by-Step Implementation Plan

### Step 1: Shared UI Foundation

Files:

- `apps/android/src/theme.ts`
- `apps/android/src/components/ui.tsx`

Changes:

- Add semantic color aliases for brand, surface, status, and text roles.
- Add reusable compact UI pieces for command cards, task rows, and data rows where useful.
- Improve bottom padding so content does not feel trapped behind the tab bar.
- Improve error state contrast so errors feel serious but still readable.

Acceptance:

- Existing screens still typecheck.
- Shared components remain backward-compatible.

### Step 2: Home Command Center

File:

- `apps/android/app/(tabs)/index.tsx`

Changes:

- Replace scattered hero messaging with a clear command card.
- Make the first viewport show active tournament, countdown, registration status, and next action.
- Reduce duplicated social/support sections.
- Make "My match desk" more compact and action-led.

Acceptance:

- A player can tell what to do next within 3 seconds.
- Home routes the player to Arena, Feed, Community, or Support without becoming a long dashboard.

### Step 3: Arena Match-Day Desk

File:

- `apps/android/app/(tabs)/arena.tsx`

Changes:

- Add a top player-state command section.
- Keep game selection obvious.
- Surface proof upload in the main flow.
- Surface "My proof" submissions in the main flow.
- Reduce the generic "Result proof" informational card.
- Keep registration prompt helpful but not dominant when the player already has an entry.

Acceptance:

- Check-in, room credentials, fixtures/standings, proof upload, and proof history are discoverable.
- Proof upload is visible without guessing.
- Existing mutation and query behavior remains intact.

### Step 4: Feed Polish

Files:

- `apps/android/app/(tabs)/feed.tsx`
- `apps/android/src/components/feed-post-card.tsx`

Changes:

- Improve official identity.
- Improve media overlay contrast.
- Make feed actions clearer.
- Keep visual polish without adding release-risky dependencies unless needed.

Acceptance:

- Feed cards remain readable on dark media.
- Official PlayMechi content is visually clear.

### Step 5: Community Chat Shell

File:

- `apps/android/app/(tabs)/community.tsx`

Changes:

- Make the screen read as a chat room instead of a message board.
- Add challenge chips.
- Improve message bubbles and sender identity.
- Keep sending behavior unchanged.

Acceptance:

- Community looks like a live gaming chat.
- Message sending remains functional.

### Step 6: Verification

Commands:

```bash
npm run typecheck
npx eas-cli@latest build -p android --profile production
```

Debug checklist:

- Login works with correct credentials.
- First launch routes correctly.
- Home loads registration summary.
- Arena loads tournament state.
- Check-in form still validates.
- Proof upload selector opens.
- Feed loads without contrast issues.
- Community can send a message.
- Profile can sign out.

### Step 7: Google Play Submission

Production command:

```bash
npx eas-cli@latest submit -p android --profile production --latest
```

Important:

- This is public-facing.
- Final submission should only run after the build succeeds and the Boss confirms final release approval.

## Release Risk Notes

- Arena is highest risk because it touches check-in and proof upload.
- Adding new native dependencies would increase build risk; keep dependency changes minimal.
- Google Play production submission may require review time even after successful upload.
- If EAS detects an already-submitted build, use the latest successful new build artifact.

## Definition of Done

- Detailed UI review exists.
- Implementation plan exists.
- P0 UI changes are committed locally.
- TypeScript passes.
- Android production build succeeds.
- Build artifact is ready for Google Play.
- Final production submit is either completed with returned submission details or explicitly waiting for Boss confirmation.

