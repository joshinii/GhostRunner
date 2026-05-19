# Ghost Strategist — Deployment Guide

## Prerequisites

- **Apple Developer Account** — required for iOS builds and TestFlight distribution
- **Expo Account** — sign up at https://expo.dev; run `npx expo login`
- **Node.js** v18+ and npm
- **EAS CLI** — installed automatically via `npx eas-cli`
- **Firebase CLI** — `npm install -g firebase-tools` then `firebase login`

## Local Development

```bash
npm install
npx expo start --ios        # iOS Simulator
npx expo start              # Expo Go (QR code)
```

## iOS Build with EAS

### Step 1 — Configure EAS (first time only)

```bash
npx eas-cli init            # links project to your Expo account
npx eas build:configure     # generates eas.json and updates app.json
```

### Step 2 — Build for iOS Simulator (development)

```bash
npx eas build --platform ios --profile development
```

This produces a `.app` file you can drag into Xcode Simulator.

### Step 3 — Build for internal distribution (TestFlight / direct install)

```bash
npx eas build --platform ios --profile preview
# or use the convenience script:
bash scripts/deploy.sh
```

Monitor the build at https://expo.dev/builds.

### Step 4 — Install on a physical device

Option A — **TestFlight**: submit the `.ipa` via `npx eas submit --platform ios --profile preview` and distribute through App Store Connect.

Option B — **Direct install**: download the `.ipa` from the Expo dashboard and use Apple Configurator 2 or Xcode Devices window to install.

## Firebase Cloud Functions Deployment

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

To deploy to the emulator for local testing:

```bash
firebase emulators:start --only functions,firestore
```

## Environment Variable Setup

The Cloud Function reads `functions.config().openai.key`. Set it with:

```bash
firebase functions:config:set openai.key="<YOUR_OPENAI_API_KEY>"
firebase deploy --only functions
```

For local emulator, create `functions/.runtimeconfig.json`:

```json
{
  "openai": {
    "key": "<YOUR_OPENAI_API_KEY>"
  }
}
```

## app.json Configuration

Key fields for iOS submission:

| Field | Value |
|-------|-------|
| `ios.bundleIdentifier` | `edu.sjsu.cmpe277.ghoststrategist` |
| `ios.buildNumber` | Increment for each TestFlight upload |
| `version` | Semantic version (`1.0.0`) |

## Screenshots

App screenshots are in `docs/screenshots/`. See `docs/PERFORMANCE.md` for architecture details.
