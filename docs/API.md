# Ghost Strategist — Server-Side API Contract

**Backend**: Firebase Cloud Functions (Node.js)  
**Transport**: Firebase HTTPS Callable (Firebase SDK `httpsCallable`)  
**Authentication**: Firebase App Check (implicit via Firebase SDK); no user authentication required — all data is scoped to `DEMO_USER_ID`

---

## Endpoint: `getCoachingInstruction`

**Type**: Firebase HTTPS Callable  
**Invocation**: Client calls `httpsCallable(functions, "getCoachingInstruction")(snapshot)`  
**Location**: `functions/src/index.ts:185`  
**Client wrapper**: `services/coaching.ts:getCoachingInstruction()`

---

## Request Schema

The callable accepts a single JSON object conforming to `CoachingSnapshot`. All 13 fields are required and must be finite numbers except `mode`.

| Field | Type | Unit | Valid Range | Description |
|---|---|---|---|---|
| `distanceRemaining` | `number` | metres | ≥ 0 | Metres remaining to the ghost route end |
| `elapsedMs` | `number` | ms | ≥ 0 | Race clock since "Go" |
| `elevationAhead` | `number` | metres | any | Net elevation change in the next 45 s (positive = uphill) |
| `gapMeters` | `number` | metres | any | User position minus ghost position (positive = ahead, negative = behind) |
| `heartRate` | `number` | bpm | > 0 | Current heart rate |
| `maxHeartRate` | `number` | bpm | > 0 | Athlete's estimated maximum heart rate (default: 192) |
| `mode` | `"run" \| "ride"` | — | `"run"` or `"ride"` | Activity mode |
| `pace` | `number` | min/km | > 0 | Current pace |
| `projectedFinishMs` | `number` | ms | ≥ 0 | Predicted finish time (from `predictFinishTimeMs()`) |
| `speed` | `number` | m/s | ≥ 0 | Current GPS speed |
| `targetPace` | `number` | min/km | > 0 | Goal pace (default: 5.2 for run, 2.35 for ride) |
| `timeGapSeconds` | `number` | seconds | any | Gap converted to seconds using current pace |
| `weatherWindMph` | `number` | mph | ≥ 0 | Current headwind (default: 7 mph) |

**Validation error**: If any required field is missing or not a finite number (or `mode` is not `"run"`/`"ride"`), the function throws `HttpsError("invalid-argument", "A complete Ghost Strategist snapshot is required.")`.

---

## Response Schema

The callable returns a `CoachingInstruction` JSON object.

| Field | Type | Description |
|---|---|---|
| `instruction` | `string` | Coaching instruction (≤ 16 words) to display and speak |
| `reason` | `string` | Explanation of why this instruction was chosen |
| `severity` | `"info" \| "push" \| "hold" \| "recover" \| "danger"` | Urgency level; controls card colour and Bio-Guard behaviour |
| `toolUsed` | `string` | Name of the reasoning tool that produced this instruction |
| `safetyOverride` | `boolean` | `true` if Bio-Guard triggered; client must pause ghost when `true` |
| `projectedFinishMs` | `number` | Echo of the request's `projectedFinishMs` for client display |

### Severity semantics

| Severity | Card colour | Meaning | Client action |
|---|---|---|---|
| `danger` | Red | Bio-Guard: HR too high | Pause ghost, lock coaching until HR < 170 |
| `recover` | Orange | Back off effort | Show card + speak |
| `push` | Blue | Close the gap | Show card + speak |
| `hold` | Yellow | Maintain current effort | Show card + speak |
| `info` | Grey | Status update | Show card + speak |

---

## Three-Tier Safety Model

```
Client (device)
  └─ makeLocalCoachingInstruction(snapshot)   ← heuristic, always available
       │  safetyOverride?
       │  YES → return danger instruction immediately (Bio-Guard)
       │  NO  → call getCoachingInstruction callable
       │
Firebase Cloud Function
  └─ heuristicInstruction(snapshot)           ← server-side safety re-check
       │  safetyOverride?
       │  YES → return danger instruction, skip OpenAI
       │  NO  → call OpenAI gpt-4o-mini
       │
OpenAI gpt-4o-mini (response_format: json_object)
  └─ Validate JSON shape
       ├─ Valid → return enriched instruction
       └─ Invalid / error → return heuristic instruction
```

The safety guarantee: a `danger` instruction is **never overridden** by OpenAI. The server checks `safetyOverride` before making any OpenAI call (`functions/src/index.ts:193`).

---

## OpenAI Integration

| Property | Value |
|---|---|
| Model | `gpt-4o-mini` |
| Endpoint | `https://api.openai.com/v1/chat/completions` |
| Response format | `{ "type": "json_object" }` |
| System prompt | *"You are Ghost Strategist, a real-time running and cycling race coach. Use the provided tool snapshot. Safety always overrides performance. Respond only with JSON containing instruction (max 16 words), severity (info, push, hold, recover, danger), reason, safetyOverride, and toolUsed."* |
| User message | Full `CoachingSnapshot` + `heuristicBaseline` field (the heuristic result) |
| API key | Set via `firebase functions:config:set openai.key="<key>"` |

If `openai.key` is not configured, the function logs a warning and returns the heuristic result without calling OpenAI.

---

## Heuristic Decision Chain

The server heuristic (mirrored identically client-side in `utils/agentTools.ts`) evaluates conditions in strict priority order:

| Priority | Condition | Severity | Tool Used |
|---|---|---|---|
| 1 | `heartRate ≥ 185` OR `heartRate / maxHeartRate ≥ 0.96` | `danger` | Bio-Guard Tool |
| 2 | `heartRate / maxHeartRate ≥ 0.92` AND `elevationAhead > 4` | `recover` | Heart Rate Analysis Tool |
| 3 | `gapMeters < −18` AND `heartRate / maxHeartRate < 0.90` | `push` | Dynamic Pacer Tool |
| 4 | `elevationAhead > 6` | `hold` | Upcoming Elevation Scan Tool |
| 5 | `weatherWindMph ≥ 14` | `hold` | Terrain and Weather Analyst Tool |
| Default | All other states | `info` | Predict Finish Time Tool |

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Missing or invalid snapshot field | `HttpsError("invalid-argument")` thrown; client catches and calls local heuristic |
| OpenAI returns non-200 | Server logs error, returns heuristic result |
| OpenAI returns malformed JSON | Server logs parse failure, returns heuristic result |
| OpenAI response missing required fields | Server logs shape error, returns heuristic result |
| Cloud Function unreachable (network) | Client `services/coaching.ts` catches, calls `makeLocalCoachingInstruction()` |

---

## Rate Limiting

Enforced client-side: `COACHING_CONFIG.minIntervalMs = 15,000 ms` (`constants/config.ts`). The server imposes no additional rate limit, relying on the client debounce to prevent excessive calls. During Bio-Guard pause the coaching call is skipped entirely.

---

## Firestore Data Model

Sessions are stored in the `sessions` collection (path: `/sessions/{sessionId}`).

### Session document

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | Always `"demo-user"` |
| `title` | `string` | Auto-generated from mode and source |
| `mode` | `"run" \| "ride"` | Activity mode |
| `source` | `"recorded" \| "demo" \| "imported"` | How the session was created |
| `startedAt` | `number` | Unix timestamp (ms) |
| `distance` | `number` | metres |
| `duration` | `number` | ms |
| `points` | `SessionPoint[]` | GPS telemetry array |
| `summary` | `SessionSummary` | Aggregated analytics |
| `coachingEvents` | `CoachingEvent[]` | All coaching decisions from races |
| `raceResults` | `RaceResultSummary[]` | One entry per race |
| `goal` | `TrainingGoalSnapshot?` | Target distance/pace/time |
| `weather` | `WeatherSnapshot?` | Wind, temp, condition |
| `syncStatus` | `"synced" \| "pending"` | Firestore sync state |

### CoachingEvent sub-document

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID |
| `elapsedMs` | `number` | Race clock at time of event |
| `timestamp` | `number` | Unix ms |
| `severity` | severity enum | Coaching severity |
| `instruction` | `string` | Instruction text |
| `reason` | `string` | Agent reasoning |
| `toolUsed` | `string` | Tool name |
| `safetyOverride` | `boolean` | Bio-Guard flag |
| `heartRate` | `number` | HR at event time |
| `gapMeters` | `number` | Gap at event time |
| `projectedFinishMs` | `number` | Projected finish at event time |
| `snapshotAtEvent` | `object?` | `{ heartRate, pace, gapMeters, elevationAhead }` |
