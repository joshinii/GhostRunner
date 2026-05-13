# Ghost Runner

iOS GPS running app. User records a route, then races a ghost of their
past self on the same map. AI coaching fires every 15 seconds.
Expo + TypeScript + Firebase + Apple Maps.

## Commands — run these, nothing else
Type-check:   npx tsc --noEmit
Tests:        npx jest
Start:        npx expo start --ios
Firebase:     firebase emulators:start

## File map — one concern per file, no exceptions
app/(tabs)/index.tsx       session list
app/record.tsx             GPS recording screen
app/race/[id].tsx          race screen
app/session/[id].tsx       session detail
services/location.ts       ALL expo-location calls
services/ghost.ts          ALL lerp/interpolation logic
services/sessions.ts       ALL Firestore reads and writes
services/coaching.ts       ALL Cloud Function triggering
hooks/useRecording.ts      recording state
components/CoachingCard.tsx
constants/config.ts        DEMO_USER_ID = 'demo-user'

## Hard constraints
- MapView provider: PROVIDER_DEFAULT always. Never PROVIDER_GOOGLE.
- userId: always DEMO_USER_ID. Never accept it as a parameter.
- Ghost functions: pure only. No React, no imports outside services/ghost.ts.
- useState: never for values updated inside requestAnimationFrame. Use useRef.
- New packages: never install without asking first.
- Scope: no analytics, social features, multi-user, or third-party auth.
- After every file change: run tsc --noEmit. Fix all errors before continuing.
- New function in services/ghost.ts: write Jest test before calling it from a screen.

## Non-obvious patterns (things the model gets wrong without this)
- expo-location config: accuracy High, timeInterval 1000, distanceInterval 0
- MapView re-render during rAF: use setInterval tick counter in useState,
  not setState inside the rAF callback
- Firestore emulator: connect only when __DEV__ === true
- Pace calc: skip if time delta < 1s or distance delta < 1m, carry forward previous

## Out of scope — do not implement these
Apple Health, Strava, CloudKit, push notifications, leaderboards,
user accounts, Android support, dark mode, iPad layout.

## Token efficiency
- Write code. Do not explain before or summarise after.
- No comments on standard patterns (hooks, queries, map setup).
- Do not re-read files already read this session.
- Do not search the repo when the file path is in the map above.
- Fix only the error asked about. Do not refactor surrounding code.
- Output only changed files. Do not reprint unchanged files.
- One task per session. Stop and ask before starting a second task.
- Do not ask clarifying questions on unambiguous tasks. Act.
