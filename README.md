# GhostStrategist

iOS running app built with Expo, TypeScript, Firebase, Apple Maps, and Firebase Cloud Functions.

The app records GPS runs, saves sessions to Firestore, lets the user race a ghost of a previous run, and shows AI coaching during the race.

## Implemented

- React Navigation stack with `HomeScreen`, `RecordScreen`, `SessionDetailScreen`, and `RaceScreen`
- Firestore-backed session history filtered by `DEMO_USER_ID`
- GPS recording with high accuracy updates every 1000ms
- Route recording with points containing `lat`, `lng`, `timestamp`, and `pace`
- Haversine distance and pace calculation
- Map polyline rendering for recorded routes
- Firestore session save to `/sessions`
- Empty, loading, permission-denied, retry, and weak GPS states
- Session detail screen with run stats
- Pure ghost engine with binary search interpolation
- Race screen with live user marker and ghost marker
- Race HUD with gap, pace, BPM, distance, and elapsed time
- Simulated heart rate hook with drift and recovery behavior
- Race end result bottom sheet with Race Again and Back to Home
- Firebase callable Cloud Function `getCoachingInstruction`
- Coaching trigger every 15 seconds during a race
- Coaching overlay card with severity colors, slide-up animation, auto-dismiss, tap-dismiss, and text-to-speech
- Bio-guard pause: ghost freezes at high simulated HR and resumes after recovery
- Shared typography system in `theme.ts`
- App icon and splash configuration in `app.json`

## Requirements

- Node.js
- Expo CLI through `npx`
- Xcode fully installed for iOS Simulator
- Firebase CLI

If Expo cannot find the iOS simulator, point command-line tools at Xcode:

```sh
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

## Install

```sh
npm install
cd functions
npm install
cd ..
```

## Run the App

Start Firebase emulators:

```sh
firebase emulators:start
```

Start the iOS app:

```sh
npx expo start --ios
```

## Checks

Type-check the Expo app:

```sh
npx tsc --noEmit
```

Build Firebase Functions:

```sh
cd functions
npm run build
cd ..
```

## Firebase Functions

Set the OpenAI key:

```sh
firebase functions:config:set openai.key="YOUR_KEY"
```

Deploy functions:

```sh
firebase deploy --only functions
```

## Testing Flow

1. Start Firebase emulators.
2. Start the iOS app.
3. Record a run from `RecordScreen`.
4. Stop the run and confirm it saves.
5. Return to `HomeScreen` and select the saved session.
6. Tap Race.
7. Confirm countdown, route drawing, ghost marker, live marker, HUD, coaching card, TTS, and race result.

Useful logs are prefixed with:

```text
[GhostStrategist]
```
