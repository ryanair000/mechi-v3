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

The default mobile API URL is `http://10.0.2.2:3000`, which works for the Android emulator. For a physical device, set the backend URL before starting Expo:

```bash
EXPO_PUBLIC_MECHI_API_URL=http://YOUR_LAN_IP:3000 npm run android:dev
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

Internal APK:

```bash
npx eas build --platform android --profile preview
```

Play Store app bundle:

```bash
npx eas build --platform android --profile production
```
