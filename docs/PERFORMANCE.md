# Ghost Strategist — Performance Documentation

## Ghost Interpolation: O(log n) Binary Search

**Implementation**: `utils/ghostEngine.ts` — `ghostPosition()`

The ghost engine locates the two route points bracketing the current elapsed time using binary search, not a linear scan.

| Array Size | Binary Search | Linear Scan |
|------------|---------------|-------------|
| 100 pts    | ~7 ops        | ~50 ops avg |
| 1,000 pts  | ~10 ops       | ~500 ops avg |
| 10,000 pts | ~13 ops       | ~5,000 ops avg |

**Benchmark**: `benchmarkGhostInterpolation(10000)` runs 1,000 interpolations on a 10K-point route in < 1 ms per call (see `utils/benchmarks.ts`).

## requestAnimationFrame Ghost Animation Loop

**Implementation**: `screens/RaceScreen.tsx`

The ghost marker position is updated via `requestAnimationFrame`, which:
- Runs at the display refresh rate (60 fps on most devices)
- Yields to the JS thread between frames — non-blocking UI
- Automatically pauses when the app is backgrounded

## 15-Second Coaching Debounce

**Implementation**: `services/coaching.ts` — `COACHING_CONFIG.minIntervalMs`

The coaching service enforces a minimum 15-second gap between calls to the Firebase Cloud Function. This:
- Prevents API flooding during intense race moments
- Caps Firebase callable invocations to ≤ 4/min per user
- Falls back to the local heuristic if the interval hasn't elapsed

## 48-Point Downsampling in SessionDetail Charts

**Implementation**: `screens/SessionDetailScreen.tsx`

Before rendering mini-charts, telemetry is downsampled to 48 evenly-spaced points. This:
- Keeps chart rendering under 16 ms (one frame budget)
- Reduces memory pressure for long sessions (720+ points for a 12-min run)

## Firebase Emulator Fallback

**Implementation**: `services/firebase.ts`

In development, the app detects `__DEV__` and connects to the local Firebase emulator. This:
- Eliminates network round-trips during demos and development
- Prevents accidental writes to the production Firestore database
- Keeps cold-start session load time under 100 ms on a local machine

## 1 Hz GPS Polling

**Implementation**: `services/location.ts`

GPS location is polled at 1 Hz (`distanceInterval: 5m` or time-based). This balances:
- **Accuracy**: 1-second resolution is sufficient for pace and ghost interpolation
- **Battery**: Higher polling rates (10 Hz) drain the battery 3–5× faster with minimal accuracy gain for running/cycling speeds

## Telemetry Summarizer

**Implementation**: `utils/raceAnalytics.ts` — `summarizeTelemetry()`

`benchmarkTelemetrySummary(1000)` runs the summarizer 100 times on a 1,000-point session in < 10 ms per call.
