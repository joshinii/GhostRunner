# Ghost Strategist — Requirements Specification

**Course**: CMPE 277 Smartphone Application Development  
**Institution**: San Jose State University  
**Team**: Jaya Vyas | Joshini Naagraj | Mohsen Minai  
**Platform**: iOS — native app: Swift / SwiftUI / MapKit; backend layer: Expo / React Native / TypeScript / Firebase

---

## Functional Requirements

### FR-01 — GPS Session Recording
**Requirement**: The app shall record the user's GPS position at 1 Hz with high accuracy mode during an active workout session.  
**Acceptance criteria**: Each recorded `SessionPoint` includes `lat`, `lng`, `timestamp`, `speed`, `accuracy`, and optionally `elevation`. Points are stored in Firestore on session end.  
**Implemented in**: `services/location.ts`, `screens/RecordScreen.tsx`, `services/sessions.ts`

### FR-02 — Activity Mode Selection
**Requirement**: The user shall be able to toggle between Run and Ride modes before and during a recording session.  
**Acceptance criteria**: Mode is persisted on the `Session` object and affects target pace thresholds and coaching instruction context.  
**Implemented in**: `constants/config.ts (ActivityMode)`, `screens/RecordScreen.tsx`

### FR-03 — Ghost Racing
**Requirement**: The user shall be able to race against a previously recorded session (the "ghost"). The ghost position shall be interpolated smoothly in real time.  
**Acceptance criteria**: Ghost position updates at 60 fps via `requestAnimationFrame`. Binary search interpolation produces a position accurate to within one GPS point interval.  
**Implemented in**: `utils/ghostEngine.ts`, `screens/RaceScreen.tsx`

### FR-04 — Real-Time Race HUD
**Requirement**: During a race, the app shall display a heads-up display showing: gap to ghost (metres), time gap (seconds), current pace, heart rate zone, projected finish time, and upcoming elevation change.  
**Acceptance criteria**: All six HUD values update within one second of the underlying data changing.  
**Implemented in**: `screens/RaceScreen.tsx`, `utils/agentTools.ts`

### FR-05 — Real-Time Coaching
**Requirement**: The app shall issue a coaching instruction every 15 seconds during a race, delivered as a card UI overlay and spoken via text-to-speech.  
**Acceptance criteria**: Coaching fires no more frequently than `COACHING_CONFIG.minIntervalMs` (15,000 ms). Instruction card shows severity, instruction text, reason, and tool used. `expo-speech` reads the instruction aloud.  
**Implemented in**: `screens/RaceScreen.tsx`, `components/CoachingCard.tsx`, `services/coaching.ts`

### FR-06 — Bio-Guard Safety System
**Requirement**: If the athlete's heart rate reaches or exceeds 185 bpm, the app shall immediately pause the ghost, issue a danger-severity coaching instruction, and prevent further coaching until heart rate drops below 170 bpm.  
**Acceptance criteria**: Bio-Guard activates at `BIO_GUARD_CONFIG.pauseThreshold` (185 bpm). Ghost resumes automatically at `BIO_GUARD_CONFIG.resumeThreshold` (170 bpm). The coaching instruction always has `safetyOverride: true` during Bio-Guard.  
**Implemented in**: `screens/RaceScreen.tsx`, `constants/config.ts (BIO_GUARD_CONFIG)`

### FR-07 — Agentic Coaching via Cloud Function
**Requirement**: The coaching system shall call a Firebase Cloud Function that applies a safety heuristic first and then optionally enriches the instruction using OpenAI `gpt-4o-mini`.  
**Acceptance criteria**: Cloud Function validates the full 13-field snapshot. Safety heuristic runs before any OpenAI call. OpenAI output is validated against the `CoachingInstruction` schema before use. Invalid or unavailable responses fall back to the heuristic.  
**Implemented in**: `functions/src/index.ts`, `services/coaching.ts`

### FR-08 — Offline / Heuristic Fallback
**Requirement**: If the Cloud Function is unavailable, the app shall fall back to a local heuristic coaching decision with no user-visible error.  
**Acceptance criteria**: `services/coaching.ts` catches all callable errors and calls `makeLocalCoachingInstruction()`. The resulting instruction is indistinguishable in the UI from a server-generated one.  
**Implemented in**: `services/coaching.ts`, `utils/agentTools.ts`

### FR-09 — Session Persistence
**Requirement**: Completed sessions shall be saved to Firestore. If Firestore is unavailable, sessions shall be saved to an in-memory local queue and returned alongside future remote queries.  
**Acceptance criteria**: `saveSession()` resolves with a session ID in both the Firestore-success and Firestore-failure paths. `getSessions()` merges remote and local sessions, deduplicating by ID.  
**Implemented in**: `services/sessions.ts`

### FR-10 — Race Result Recording
**Requirement**: When a race ends, the final gap, user time, average pace, and coaching event count shall be saved as a `RaceResultSummary` on the session document.  
**Acceptance criteria**: `saveRaceResult()` persists to Firestore or local fallback. The result appears in `session.raceResults` on next load.  
**Implemented in**: `services/sessions.ts`, `screens/RaceScreen.tsx`

### FR-11 — Coaching Event History
**Requirement**: Every coaching instruction issued during a race shall be recorded as a `CoachingEvent` on the session, including the agent snapshot at the time of the decision.  
**Acceptance criteria**: Each event contains `elapsedMs`, `severity`, `toolUsed`, `instruction`, `reason`, and `snapshotAtEvent` (HR, pace, gap, elevation). Events are persisted with the race result.  
**Implemented in**: `services/sessions.ts (CoachingEvent)`, `screens/RaceScreen.tsx`

### FR-12 — Post-Race Session Analytics
**Requirement**: The session detail screen shall display: average pace, average and max heart rate, elevation gain, data quality score, packet loss count, and mini-charts for pace, HR, and elevation over time.  
**Acceptance criteria**: All metrics derive from `summarizeTelemetry()`. Charts downsample to 48 points for performance.  
**Implemented in**: `screens/SessionDetailScreen.tsx`, `utils/raceAnalytics.ts`

### FR-13 — GPS Smoothing Pipeline
**Requirement**: The app shall smooth raw GPS points by filtering outliers (accuracy > 50 m), applying exponential moving average (α = 0.3), and interpolating gaps greater than 3 seconds.  
**Acceptance criteria**: `smoothGPSPoints()` returns a cleaned array. SessionDetailScreen shows before/after point counts.  
**Implemented in**: `utils/dataEngineering.ts`, `screens/SessionDetailScreen.tsx`

### FR-14 — Post-Race Narrative
**Requirement**: If a session has coaching events and a race result, the session detail screen shall display a natural-language narrative describing key agent decisions.  
**Acceptance criteria**: Narrative includes: Bio-Guard activations with HR context, push clusters with gap context, recover events with elevation context, and a final summary line.  
**Implemented in**: `utils/raceNarrative.ts`, `screens/SessionDetailScreen.tsx`

### FR-15 — Adaptive Coaching (Feedback Loop)
**Requirement**: The coaching agent shall adjust its coaching style based on how the athlete has responded to past advice in the same session.  
**Acceptance criteria**: `analyzeCoachingEffectiveness()` evaluates each past event against telemetry 30 s after the event. `getCoachingPersonalization()` returns `pushFrequency` (0.5–1.0) and `severityBias` (0 or 1) that are passed to the coaching call.  
**Implemented in**: `services/feedbackLoop.ts`, `screens/RaceScreen.tsx`

### FR-16 — Weekly Training Trends
**Requirement**: The home screen shall display weekly training trends when two or more weeks of session data exist.  
**Acceptance criteria**: `computeWeeklyTrends()` groups sessions by ISO week. HomeScreen renders total distance, session count, and pace improvement per week.  
**Implemented in**: `utils/dataEngineering.ts`, `screens/HomeScreen.tsx`

### FR-17 — Demo Session Seeding
**Requirement**: The app shall provide a "Seed Demo Race" action that generates realistic synthetic session data for demonstration purposes.  
**Acceptance criteria**: Demo session contains a complete GPS route, mock telemetry at 1 Hz, and pre-seeded coaching events.  
**Implemented in**: `services/demoSession.ts`, `screens/HomeScreen.tsx`

---

## Non-Functional Requirements

### NFR-01 — GPS Polling Rate
**Requirement**: GPS position shall be polled at a maximum interval of 1,000 ms (1 Hz) with high-accuracy mode.  
**Rationale**: Balances location precision against battery drain.  
**Implemented in**: `services/location.ts`

### NFR-02 — Ghost Interpolation Performance
**Requirement**: Ghost position interpolation shall complete in under 1 ms per call for route arrays of up to 10,000 points.  
**Rationale**: Interpolation runs inside `requestAnimationFrame` at 60 fps; any call exceeding 16 ms total budget drops frames.  
**Verified by**: `utils/benchmarks.test.ts` — benchmark passes at < 0.008 ms per call on 10,000 points.  
**Implemented in**: `utils/ghostEngine.ts`

### NFR-03 — Coaching Interval
**Requirement**: Coaching instructions shall not fire more frequently than once every 15,000 ms during normal operation.  
**Rationale**: Prevents API flooding and gives the athlete time to respond to each instruction.  
**Implemented in**: `constants/config.ts (COACHING_CONFIG.minIntervalMs)`, `screens/RaceScreen.tsx`

### NFR-04 — Platform
**Requirement**: The app shall target iOS only. The native demo app uses Swift 6 / SwiftUI / MapKit (Xcode 16, iOS 18.4). The backend integration layer uses Expo SDK 52 / React Native / TypeScript with Firebase.  
**Implemented in**: `GhostRunner/GhostRunner.xcodeproj`, `app.json`, `eas.json`

### NFR-05 — Type Safety
**Requirement**: All source files shall pass TypeScript strict mode checks with zero errors.  
**Verified by**: `npm run typecheck`  
**Implemented in**: `tsconfig.json`

### NFR-06 — Backend
**Requirement**: All persistent session data shall be stored in Firestore under the `sessions` collection, keyed by `userId`.  
**Implemented in**: `services/sessions.ts`, `constants/config.ts (FIRESTORE_COLLECTIONS)`

### NFR-07 — Offline Resilience
**Requirement**: The app shall remain functional for recording and coaching when Firestore and the Cloud Function are unavailable. Data shall be queued locally and merged on next successful connection.  
**Implemented in**: `services/sessions.ts`, `services/coaching.ts`

### NFR-08 — Test Coverage
**Requirement**: All utility functions shall have unit tests covering normal operation, boundary values, and error conditions.  
**Verified by**: 96 Jest tests across 8 test files (`npm test`)

### NFR-09 — Chart Rendering Performance
**Requirement**: Session analytics charts shall downsample to a maximum of 48 data points before rendering to stay within the 16 ms frame budget.  
**Implemented in**: `screens/SessionDetailScreen.tsx (MiniChart)`

### NFR-10 — Bio-Guard Response Time
**Requirement**: Bio-Guard shall activate within one coaching cycle (≤ 1 s) of heart rate reaching the danger threshold.  
**Rationale**: Athlete safety is the highest priority constraint.  
**Implemented in**: `screens/RaceScreen.tsx`
