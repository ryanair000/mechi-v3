# Mechi Android

Native Android MVP for Mechi, built with Expo and React Native.

## Run locally

Start the Mechi backend from the repo root:

```bash
npm run dev
```

Start the Android app:

```bash
npm run android:dev
```

Open the native Android Studio project here after prebuild:

```text
apps/android/android
```

In local Expo development, the default mobile API URL is `http://10.0.2.2:3000`, which works for the Android emulator. For a physical device, set the backend URL before starting Expo:

```bash
EXPO_PUBLIC_MECHI_API_URL=http://YOUR_LAN_IP:3000 npm run android:dev
```

Installed builds fall back to `https://mechi.club` unless `EXPO_PUBLIC_MECHI_API_URL` is set at build time.

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

## Current MVP scope

- Register and log in
- Secure token persistence
- Profile completion/editing
- Game and platform setup
- Queue joining for 1v1 games
- Lobby list/create/join for lobby games
- Active match view
- Match result submit
- Dispute screenshot upload
- Leaderboard
- Profile/logout

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
