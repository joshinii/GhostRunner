# Services layer — strict rules

This folder contains pure logic only. No React, no hooks, no JSX.

## services/ghost.ts rules
- getGhostPosition(points, elapsedMs) must be a pure function
- Input: RecordedPoint[], number — Output: { lat: number, lng: number }
- Lerp linearly between the two bracketing points by timestamp
- elapsedMs=0 → return points[0], elapsedMs≥duration → return last point
- Every exported function needs a Jest test before it is called from a screen

## services/location.ts rules
- All expo-location calls live here and nowhere else
- Accuracy: Location.Accuracy.High
- timeInterval: 1000, distanceInterval: 0
- Return cleanup function from startWatchingLocation

## services/sessions.ts rules
- All Firestore reads and writes live here and nowhere else
- userId is always DEMO_USER_ID — never accept it as a parameter
- Use React Query's queryClient.invalidateQueries after every write

## services/coaching.ts rules
- Enforce 15s minimum gap between Cloud Function calls client-side
- On any network error: log and continue, never throw to the screen
- Never call the Cloud Function from a screen directly
