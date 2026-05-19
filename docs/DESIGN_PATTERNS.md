# Design Patterns in Ghost Strategist

## Observer Pattern

- `services/location.ts`: `startWatchingLocation` uses a callback-based observer. The caller registers a handler; the service fires it on every GPS update from expo-location.
- `hooks/useMockHeartRate.ts`: interval-based observable heart rate stream. Components subscribe via the hook; the interval fires updates at 1 Hz.

## Strategy Pattern

- `functions/src/index.ts`: `heuristicInstruction` chains multiple strategy branches — Bio-Guard → threshold+elevation → gap → elevation scan → weather → default. Each branch is a self-contained decision.
- `utils/agentTools.ts`: `makeLocalCoachingInstruction` mirrors the same strategy chain client-side as an offline fallback.

## Builder Pattern

- `screens/RaceScreen.tsx`: `maybeRequestCoaching` assembles an `AgentSnapshot` object step-by-step from GPS position, heart rate hook, ghost engine output, and weather config before passing it to the coaching service.

## Repository Pattern

- `services/sessions.ts`: abstracts all Firestore operations behind `getSessions`, `saveSession`, and `saveRaceResult`. Screens never import Firestore directly.

## Singleton Pattern

- `services/firebase.ts`: a single Firebase `App` instance is created once and re-exported. All services (`db`, `functions`) are derived from this singleton.

## Facade Pattern

- `services/coaching.ts`: `getCoachingInstruction` hides the complexity of Firebase callable invocation, 15-second debounce, and local heuristic fallback behind one async function call.

## State Pattern

- `screens/RaceScreen.tsx`: the race lifecycle is managed through state refs: countdown → racing → bio-guard pause → finished. Each state controls which UI is rendered and what actions are allowed.
- `hooks/useMockHeartRate.ts`: the HR simulation is a state machine with drift, sinusoidal wave, and recovery phases.

## Adapter Pattern

- `services/location.ts`: adapts expo-location's verbose `LocationObject` into the simplified `Coord` type (`{ lat, lng }`) used throughout the app.
