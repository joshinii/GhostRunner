// Tests for heuristicInstruction logic, exercised through the exported patterns.
// We test the decision tree directly since the Cloud Function wraps it.

type CoachingSnapshot = {
  distanceRemaining: number;
  elapsedMs: number;
  elevationAhead: number;
  gapMeters: number;
  heartRate: number;
  maxHeartRate: number;
  mode: "run" | "ride";
  pace: number;
  projectedFinishMs: number;
  speed: number;
  targetPace: number;
  timeGapSeconds: number;
  weatherWindMph: number;
};

type CoachingInstruction = {
  instruction: string;
  projectedFinishMs?: number;
  reason: string;
  safetyOverride: boolean;
  severity: "info" | "push" | "hold" | "recover" | "danger";
  toolUsed: string;
};

const HEART_RATE_WARNING_THRESHOLD = 185;

function heuristicInstruction(snapshot: CoachingSnapshot): CoachingInstruction {
  const heartRatePct = snapshot.heartRate / snapshot.maxHeartRate;

  if (snapshot.heartRate >= HEART_RATE_WARNING_THRESHOLD || heartRatePct >= 0.96) {
    return {
      instruction: "Heart rate is too high. Ease off now and recover.",
      projectedFinishMs: snapshot.projectedFinishMs,
      reason: "Bio-Guard detected unsafe exertion.",
      safetyOverride: true,
      severity: "danger",
      toolUsed: "Bio-Guard Tool"
    };
  }

  if (heartRatePct >= 0.92 && snapshot.elevationAhead > 4) {
    return {
      instruction: "Hold effort before the climb. Do not chase yet.",
      projectedFinishMs: snapshot.projectedFinishMs,
      reason: "Threshold heart rate plus upcoming elevation raises fatigue risk.",
      safetyOverride: false,
      severity: "recover",
      toolUsed: "Heart Rate Analysis Tool"
    };
  }

  if (snapshot.gapMeters < -18 && heartRatePct < 0.9) {
    return {
      instruction: "Close the gap gradually. Add cadence for thirty seconds.",
      projectedFinishMs: snapshot.projectedFinishMs,
      reason: "Gap is negative and heart rate remains controllable.",
      safetyOverride: false,
      severity: "push",
      toolUsed: "Dynamic Pacer Tool"
    };
  }

  if (snapshot.elevationAhead > 6) {
    return {
      instruction: "Shorten stride and settle breathing before the hill.",
      projectedFinishMs: snapshot.projectedFinishMs,
      reason: "Upcoming Elevation Scan found a near-term climb.",
      safetyOverride: false,
      severity: "hold",
      toolUsed: "Upcoming Elevation Scan Tool"
    };
  }

  if (snapshot.weatherWindMph >= 14) {
    return {
      instruction: "Stay smooth into the wind. Keep effort steady.",
      projectedFinishMs: snapshot.projectedFinishMs,
      reason: "Weather Analyst detected effort-costing wind.",
      safetyOverride: false,
      severity: "hold",
      toolUsed: "Terrain and Weather Analyst Tool"
    };
  }

  return {
    instruction: "Hold this pace. Keep the ghost in sight.",
    projectedFinishMs: snapshot.projectedFinishMs,
    reason: "Projected finish, gap, and heart rate are balanced.",
    safetyOverride: false,
    severity: "info",
    toolUsed: "Predict Finish Time Tool"
  };
}

const baseSnap: CoachingSnapshot = {
  distanceRemaining: 1000,
  elapsedMs: 300000,
  elevationAhead: 0,
  gapMeters: 0,
  heartRate: 155,
  maxHeartRate: 192,
  mode: "run",
  pace: 5.2,
  projectedFinishMs: 420000,
  speed: 3.2,
  targetPace: 5.2,
  timeGapSeconds: 0,
  weatherWindMph: 7
};

describe("heuristicInstruction", () => {
  it("returns danger + Bio-Guard when HR >= 185", () => {
    const result = heuristicInstruction({ ...baseSnap, heartRate: 185 });
    expect(result.severity).toBe("danger");
    expect(result.safetyOverride).toBe(true);
    expect(result.toolUsed).toBe("Bio-Guard Tool");
  });

  it("returns danger when HR is 96%+ of maxHR even if below 185", () => {
    // 0.96 * 200 = 192
    const result = heuristicInstruction({ ...baseSnap, heartRate: 193, maxHeartRate: 200 });
    expect(result.severity).toBe("danger");
  });

  it("returns recover when HR >= 92% and elevation > 4", () => {
    // 0.92 * 192 = 176.64
    const result = heuristicInstruction({ ...baseSnap, heartRate: 178, elevationAhead: 5 });
    expect(result.severity).toBe("recover");
    expect(result.toolUsed).toBe("Heart Rate Analysis Tool");
  });

  it("returns push when gap < -18 and HR < 90%", () => {
    // 0.9 * 192 = 172.8
    const result = heuristicInstruction({ ...baseSnap, heartRate: 155, gapMeters: -25 });
    expect(result.severity).toBe("push");
    expect(result.toolUsed).toBe("Dynamic Pacer Tool");
  });

  it("returns hold for elevation > 6", () => {
    const result = heuristicInstruction({ ...baseSnap, elevationAhead: 8 });
    expect(result.severity).toBe("hold");
    expect(result.toolUsed).toBe("Upcoming Elevation Scan Tool");
  });

  it("returns hold for wind >= 14 mph", () => {
    const result = heuristicInstruction({ ...baseSnap, weatherWindMph: 14 });
    expect(result.severity).toBe("hold");
    expect(result.toolUsed).toBe("Terrain and Weather Analyst Tool");
  });

  it("returns info for balanced snapshot", () => {
    const result = heuristicInstruction(baseSnap);
    expect(result.severity).toBe("info");
    expect(result.safetyOverride).toBe(false);
  });
});
