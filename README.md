# Ghost Strategist

Ghost Strategist is an iOS running and cycling prototype built with Expo, TypeScript,
Firebase, Apple Maps, Firebase Cloud Functions, and an agentic AI coaching loop.

The app records GPS workouts, stores historical sessions, replays a previous
session as a ghost, predicts finish time, monitors heart-rate safety, scans
upcoming elevation, and speaks tactical coaching instructions during the race.

## Implemented

- Dashboard with athlete profile, session metrics, sync status, and demo seeding.
- GPS recording with high-accuracy 1 Hz updates.
- Running and cycling modes.
- Telemetry points with latitude, longitude, timestamp, pace, speed, elevation,
  heart rate, cadence, and GPS accuracy.
- Firestore session storage with local in-session fallback if Firebase is offline.
- Demo race generator for reliable simulator/classroom demos.
- Apple Maps route polyline with live user marker and interpolated ghost marker.
- Ghost engine using timestamp search and interpolation.
- Race HUD with distance gap, time gap, pace, BPM, HR zone, projected finish,
  upcoming elevation, and coaching-event count.
- Bio-Guard safety pause when heart rate exceeds the configured threshold.
- Agent snapshot builder with pace, gap, HR, elevation, weather, goal, and finish
  projection.
- Firebase callable Cloud Function `getCoachingInstruction`.
- Deterministic coaching fallback when the OpenAI key or emulator is unavailable.
- Coaching card with severity colors, auto-dismiss, tap-dismiss, and text-to-speech.
- Session analytics with pace, heart-rate, and elevation mini charts.
- Coaching event history for report evidence and interpretability.

## Requirements

- Node.js
- npm
- Xcode with iOS Simulator
- Firebase CLI, only if running the backend emulator/deploy flow

If Expo cannot find the iOS simulator:

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

## Run

Start the iOS app:

```sh
npm run ios
```

Optional Firebase emulator:

```sh
firebase emulators:start
```

The app can still demo without Firebase because failed session saves are stored in
an in-session local fallback. Use **Seed Demo Race** on the dashboard for a stable
simulator demo.

## Checks

Type-check the Expo app:

```sh
npm run typecheck
```

Build Firebase Functions:

```sh
cd functions
npm run build
cd ..
```

## OpenAI Key

The Cloud Function works with a deterministic heuristic fallback. To enable OpenAI
coaching text:

```sh
firebase functions:config:set openai.key="YOUR_KEY"
firebase deploy --only functions
```

## Demo Flow

1. Run the app in the iOS simulator.
2. Tap **Seed Demo Race**.
3. Open **Personal Best Chase** or **Live Rival Simulation**.
4. Review analytics and tap **Race This Ghost**.
5. Watch the simulated GPS stream, interpolated ghost, race HUD, coaching card,
   Bio-Guard behavior, and final race result.
6. Return to the session detail screen to show coaching-event evidence.

## Project Report Mapping

- Requirements: implemented through user profile, tracking, ghost racing, agent,
  history, safety, and analytics modules.
- Mobile design: dashboard, recorder, race cockpit, session analytics.
- Model engineering: snapshot builder, heuristic safety layer, OpenAI JSON output.
- Architecture: Expo iOS client, Firebase/Firestore, Cloud Functions, Apple Maps,
  OpenAI-compatible coaching layer.
- Data science: finish prediction, HR zones, elevation scan, data-quality scoring.
- Local storage and AI: local fallback session queue plus on-device heuristic agent.
- Feedback loop: coaching events are stored and tied to race outcomes.
- Interpretability: every coaching event stores reason, tool used, severity, and
  safety override.
