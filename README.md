# Ghost Strategist

**CMPE 277 — Jaya Vyas | Joshini Naagraj | Mohsen Minai | SJSU**

Ghost Strategist is an iOS running and cycling app built with Swift / SwiftUI / MapKit,
backed by Firebase Cloud Functions, TypeScript, and an agentic multi-agent AI coaching loop.

The app replays a previous GPS session as an interpolated ghost, races the athlete against
it in real time, and deploys six independent AI agents every 8 seconds to observe telemetry,
score confidence, and issue tactical coaching instructions. A Bio-Guard safety layer
interrupts all tactical advice when heart rate enters the danger zone.

## Implemented

- **Native SwiftUI app** — Dashboard, Live Race, and History tabs with dark theme.
- **Multi-agent orchestrator** — 6 independent agents (Bio-Guard, Heart Rate Analysis, Elevation Scan, Dynamic Pacer, Weather Analyst, Finish Predictor) score confidence every 8 seconds; highest-confidence agent wins.
- **Bio-Guard safety override** — always supersedes tactical advice when HR ≥ 174 bpm, regardless of other agent scores.
- **Agent votes panel** — live confidence percentages for all 6 agents visible in the Race tab.
- **Ghost racing** — O(log n) binary search interpolation keeps the ghost marker smooth at 60 fps from 1 Hz GPS samples.
- **Road-snapped route** — MKDirections snaps demo waypoints to real roads; falls back to straight-line on no network.
- GPS recording with high-accuracy 1 Hz updates, running and cycling modes.
- Firestore session storage with local in-session fallback if Firebase is offline.
- Firebase callable Cloud Function `getCoachingInstruction` with OpenAI `gpt-4o-mini` and deterministic heuristic fallback.
- Race HUD: gap, pace, BPM, HR zone, projected finish, elevation ahead.
- GPS smoothing pipeline: EMA (α=0.3), outlier filtering (accuracy > 50 m), gap interpolation.
- Race narrative generator — post-race natural-language summary of coaching decisions.
- Feedback loop — coaching events stored with race context for effectiveness analysis.
- Weekly training trends — pace improvement and distance tracked week over week.
- 96 Jest tests across 8 suites covering all utility and algorithm paths.

## Requirements

- Xcode 16+ with iOS Simulator (iPhone 17 Pro, iOS 18.4)
- Node.js + npm (for TypeScript backend layer and tests)
- Firebase CLI — only needed for backend emulator/deploy

## Run — Native Swift App (primary demo)

```sh
open GhostRunner/GhostRunner.xcodeproj
# ⌘R to build and run on simulator
```

## Run — Expo/React Native Layer

```sh
npm install
cd functions && npm install && cd ..
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

## Demo Flow (Swift App)

1. Open `GhostRunner.xcodeproj` in Xcode and run on iPhone 17 Pro Simulator.
2. Tap **Start Demo Race** on the Home tab.
3. Switch to the **Race** tab — watch the ghost and user markers move on the map.
4. Observe the coaching banner change color and instruction every 8 seconds.
5. Scroll down to the Live Snapshot panel to see all 6 agent confidence scores.
6. Let the race run until HR climbs — watch Bio-Guard take over at 100% confidence.
7. Switch to the **History** tab to see race narratives and the data pipeline panel.

## Documentation

| Doc | Contents |
|---|---|
| `docs/PROJECT_REPORT.md` | Full CMPE 277 project report |
| `docs/REQUIREMENTS.md` | Functional and non-functional requirements (FR-01 – FR-17, NFR-01 – NFR-10) |
| `docs/API.md` | Firebase Cloud Function request/response contract |
| `docs/DESIGN_PATTERNS.md` | 8 design patterns with file references |
| `docs/PERFORMANCE.md` | O(log n) benchmarks, RAF loop, debounce, downsampling |
| `docs/screenshots/` | 20 simulator screenshots |
| `docs/architecture-diagram.mermaid` | System component diagram |
| `docs/sequence-diagram.mermaid` | ORA loop sequence |
| `docs/data-flow-diagram.mermaid` | Data flow from GPS to coaching output |
