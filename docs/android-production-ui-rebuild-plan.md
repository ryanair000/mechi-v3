# PlayMechi Android Production UI Rebuild Plan

Date: 2026-05-27  
Device reviewed: `CPH2349` via ADB  
Installed package: `com.mechi.app`, versionName `1.0.6`, versionCode `43`  
Reference design folder: `Esports Tournament App Screens`

## Current Phone Evidence

Screenshots captured from the connected phone:

- `apps/android/review/current-device-2026-05-27/01-launch.png`
- `apps/android/review/current-device-2026-05-27/02-home.png`
- `apps/android/review/current-device-2026-05-27/04-feed.png`
- `apps/android/review/current-device-2026-05-27/07-community-retap.png`
- `apps/android/review/current-device-2026-05-27/08-profile-retap.png`
- Contact sheet: `apps/android/review/current-device-2026-05-27/contact-sheet.png`

## What Is Wrong

1. The shipped app is not a faithful implementation of the Figma export.
   The current app uses `apps/android/src/components/new-screens.tsx`, a large hand-built approximation. It borrows names and some imagery, but it does not preserve the intended screen structure, compactness, or visual rhythm from `Esports Tournament App Screens/src/app/screens`.

2. The bottom navigation is the biggest visual failure.
   It is oversized, grey, pill-heavy, and sits above a light system navigation strip. It looks like a floating debug control, not part of a premium esports app. Hit targets also felt unclear during device capture.

3. The app is too card-heavy and repetitive.
   The current profile, arena, and feed screens rely on big rounded cards stacked with similar borders. It feels like a component demo rather than an app built for tournament operations.

4. The top bar wastes space.
   The large centered logo plus notification badge creates a stale header on every screen. It does not feel integrated with the rest of the layout.

5. Typography lacks hierarchy.
   Many headings are huge, repeated, and too close to the Figma export without mobile-native tuning. Some important data is buried while decorative labels dominate.

6. Stale UI files remain in the app.
   Existing files such as `new-screens.tsx`, `figma-ui.tsx`, `ui.tsx`, `kinetic.tsx`, and `feed-post-card.tsx` create overlapping design systems. The production code needs one native UI layer.

7. Android system chrome is wrong.
   The app uses a dark esports UI, but the Android navigation area is light. This makes the app look unfinished on real devices.

8. The Figma export itself needs a production pass.
   The export provides the intended information architecture and tone, but it is web/Tailwind/React-router code. It must be translated into native Expo components with better density, cleaner controls, stronger spacing, and fewer decorative surfaces.

## Target Direction

Build a refined native PlayMechi UI that uses the Figma folder as the source of content and screen intent, while improving the actual phone experience:

- Dark, premium, tournament-operations interface.
- Compact native header with strict logo use.
- Smaller, cleaner bottom dock with 5 clear destinations.
- Stronger tournament cards with real images but less clutter.
- Fewer nested cards and less border noise.
- Native screen modules instead of one huge shared file.
- Local image assets only for packaged media.
- Android status/navigation bars matched to the dark app.

## Implementation Steps

1. Create a new production UI foundation.
   - Add one native design system file for tokens, surfaces, buttons, pills, stat rows, image cards, and screen shells.
   - Keep radii restrained and consistent.
   - Use the official logo assets already generated from the Figma import.

2. Replace the tab shell.
   - Rewrite `(tabs)/_layout.tsx`.
   - Remove the oversized grey dock.
   - Use a compact dark dock with icon + tiny label, active top indicator, and no giant active capsule.
   - Fix bottom safe area and Android navigation bar color.

3. Replace all route screens with production modules.
   - Home
   - Arena / tournaments
   - Feed / matches
   - Community / blog
   - Profile
   - Login / create profile / onboarding
   - Tournament detail / register / proof
   - Notifications / settings / permission
   - Challenges / results / leaderboard / teams / legal

4. Remove stale UI code.
   - Stop importing `new-screens.tsx`.
   - Delete old unused component surfaces after routes are migrated.
   - Keep only components still needed for app behavior, auth, notifications, API, and brand assets.

5. Preserve real wiring.
   - Keep auth redirects.
   - Keep tournament summary/state queries.
   - Keep registration, payment verification, check-in, push permission, and proof upload flows.
   - Avoid fake-only UI where production data already exists.

6. Verify on the phone, not just web.
   - Typecheck.
   - Expo doctor.
   - Build and install a local Android release/debug build.
   - Capture fresh ADB screenshots for the same tab set.
   - Compare against the original phone contact sheet.

## Acceptance Criteria

- No route imports `new-screens.tsx`.
- The old monolithic screen file is gone or unused.
- Phone screenshots no longer show the grey oversized dock or light bottom system strip.
- Home, Arena, Feed, Community, and Profile feel like one polished product.
- Figma content and screen intent are represented in native components.
- Typecheck passes.
- Expo doctor passes.
- Connected phone screenshot review passes before any production submission.

