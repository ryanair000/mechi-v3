# PlayMechi Android

Native Android app for PlayMechi tournament players, built with Expo and React Native.

## Run locally

Start the Mechi backend from the repo root:

```bash
npm run dev
```

Start the Android app:

```bash
npm run dev:usb
```

Open the native Android Studio project here after prebuild:

```text
apps/android/android
```

Local Android development is wired for USB debugging only. The app uses `adb reverse`, so the phone talks to the computer through `http://127.0.0.1:3000`.

```bash
npm run dev:usb
```

To rebuild and install on the connected phone:

```bash
npm run android:usb
```

Installed release builds use `https://mechi.club` unless `EXPO_PUBLIC_MECHI_API_URL` is explicitly set at build time.

## Android Studio workflow

The native Android project is now generated and can be opened directly in Android Studio from `apps/android/android`.

When you change native Expo config in `app.json` or add native plugins, sync the native project again with:

```bash
npx expo prebuild --platform android
```

If you ever want to regenerate the Android project from scratch:

```bash
npx expo prebuild --clean --platform android
```

## Current tournament scope

- Register and log in
- Secure token persistence
- Tournament-only profile completion/editing
- PlayMechi tournament overview
- PUBG Mobile, CODM, and eFootball slot registration
- Instagram and YouTube reward-verification capture
- Tournament desk with check-in
- Battle Royale room credentials and verified standings
- eFootball fixtures
- Result screenshot upload for admin review
- Prize desk status, support, legal, and logout

## Build

Direct tester APK (bypasses Google Play):

```bash
npx eas build --platform android --profile preview
```

Google Play internal testing (specific tester Google accounts):

```bash
npx eas build --platform android --profile playInternal
npx eas submit --platform android --profile playInternal --latest
```

Play Store production release:

```bash
npx eas build --platform android --profile production
```

## Tester access notes

The current Android package in this repo is `com.mechi.app`.

If someone sees a Play Store message saying the app "hasn't been released", it usually means one of these is true:

- They were sent a Google Play link for `com.mechi.app`, but no release has been published to the track yet.
- Their Google account has not been added to the tester list for the internal or closed track.
- They are looking at a different package than the older public Mechi listing.

For one-off access, the fastest path is to share the `preview` APK build link from EAS.

For Google Play-based tester access:

1. Publish an Android App Bundle with the `playInternal` profile.
2. In Play Console, add the tester email address to the internal testing list or linked Google Group.
3. Share the internal testing opt-in link with that same Google account.
4. Have the tester open the opt-in link before opening the Play Store listing.

## Mechi.club tester intake

Use the standalone web page at `/android-testers` to collect Android tester details. This is separate from PlayMechi tournament registration and writes to `android_tester_signups`.

Before sharing the page publicly, apply:

```bash
supabase/migrations/20260504130000_android_tester_signups.sql
```

Export the Play Console email list:

```bash
npm run ops:android-testers -- --play-console-csv
```

The export prints one Google Play account email per line, with no header and no BOM, so it can be pasted or uploaded into Play Console.
